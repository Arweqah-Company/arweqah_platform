import { Injectable, Logger } from '@nestjs/common';
import type { ProblemContext } from '@arweqah-platform/shared';
import { z } from 'zod';
import { FilesService } from '../../../../core/files/application/files.service';
import { AiService } from '../../../../core/integrations/application/services/ai.service';
import type { AiImage } from '../../../../core/integrations/domain/contracts/ai-client';
import { cleanModelText } from '../../domain/rules/problem-report.rules';
import type { ProblemAnalysis } from '../../domain/types/problem-report.types';
import { ANALYSIS_SYSTEM, analysisUser } from '../messages/problem-report.messages';

/** A picture takes 6 to 15 seconds or more on some services (measured on the free Gemini service); this is the most a person waits behind the button, for the try with the picture and the one without it together. */
const ANALYSIS_TIMEOUT_MS = 60_000;
/** Models that think before they write count the thinking in this limit; too small a number cuts the answer (it did on a thinking model in production). */
const ANALYSIS_MAX_TOKENS = 8_000;
const MAX_STEPS = 6;
const KINDS = ['bug', 'question', 'suggestion', 'other'] as const;

const answerSchema = z.strictObject({
  title: z.string(),
  summary: z.string(),
  stepsGuess: z.array(z.string()).max(MAX_STEPS),
  area: z.string(),
  kind: z.enum(['bug', 'question', 'suggestion', 'other']),
});

export interface AnalysisInput {
  userId: string;
  note: string;
  context: ProblemContext;
  /** The screenshot to show the model; null = it reads the text and the context only. */
  imageFileId: string | null;
}

/** What the AI made of a report, and whether it looked at the screenshot. */
export interface AnalysisResult {
  analysis: ProblemAnalysis;
  imageSeen: boolean;
}

/** Asks the AI service to read a problem report. Never throws: no reading is `null` and the person writes the description by hand. */
@Injectable()
export class ProblemReportAnalyzer {
  private readonly logger = new Logger(ProblemReportAnalyzer.name);

  constructor(
    private readonly ai: AiService,
    private readonly files: FilesService,
  ) {}

  isActive(): Promise<boolean> {
    return this.ai.isActive();
  }

  async analyze(input: AnalysisInput): Promise<AnalysisResult | null> {
    try {
      if (!(await this.ai.isActive())) return null;
      return await this.within(this.read(input));
    } catch (error) {
      this.logger.warn(`Problem report not analysed: ${error instanceof Error ? error.message : 'unknown'}`);
      return null;
    }
  }

  /** The reading with the screenshot; when that fails for any reason (a picture too big for the service, a cut or odd answer) the note and the page details are read alone, so the person still gets a title. */
  private async read(input: AnalysisInput): Promise<AnalysisResult> {
    const image = await this.image(input).catch(() => null);
    if (!image) return this.ask(input, null);
    try {
      return await this.ask(input, image);
    } catch (error) {
      this.logger.warn(`Problem report read with the screenshot failed, trying without it: ${error instanceof Error ? error.message : 'unknown'}`);
      return this.ask(input, null);
    }
  }

  private async ask(input: AnalysisInput, image: AiImage | null): Promise<AnalysisResult> {
    const question = { system: ANALYSIS_SYSTEM, user: analysisUser(input.note, input.context, image !== null), userWithoutImages: analysisUser(input.note, input.context, false), schema: answerSchema, maxTokens: ANALYSIS_MAX_TOKENS, normalize: leniently, images: image ? [image] : undefined };
    const answer = await this.ai.jsonOf(question);
    return { analysis: this.clean(answer.value), imageSeen: answer.imagesSeen };
  }

  /** The screenshot as the model reads it, or null when there is none or it is not a picture the model takes. */
  private async image(input: AnalysisInput): Promise<AiImage | null> {
    if (!input.imageFileId) return null;
    const file = await this.files.getOwned(input.imageFileId, input.userId);
    if (file.contentType !== 'image/jpeg' && file.contentType !== 'image/png') return null;
    return { mediaType: file.contentType, data: (await this.files.readBytes(file)).toString('base64') };
  }

  private within<T>(work: Promise<T>): Promise<T> {
    let timer: NodeJS.Timeout;
    const late = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('The analysis took too long')), ANALYSIS_TIMEOUT_MS);
    });
    return Promise.race([work, late]).finally(() => clearTimeout(timer));
  }

  private clean(value: z.infer<typeof answerSchema>): ProblemAnalysis {
    return {
      title: cleanModelText(value.title, 100),
      summary: cleanModelText(value.summary, 2000),
      stepsGuess: value.stepsGuess.map((s) => cleanModelText(s, 250)).filter(Boolean),
      area: cleanModelText(value.area, 150),
      kind: value.kind,
    };
  }
}

/** A weaker model sends a seventh step, a missing field or a kind of its own; the answer is put into the shape before it is checked (the check still applies). */
function leniently(raw: unknown): unknown {
  if (!raw || typeof raw !== 'object') return raw;
  const a = raw as Record<string, unknown>;
  const text = (v: unknown): string => (typeof v === 'string' ? v : '');
  // An answer with no title and no summary is not a reading at all: it goes on as it came and the check refuses it.
  if (!text(a.title).trim() && !text(a.summary).trim()) return raw;
  const steps = Array.isArray(a.stepsGuess) ? a.stepsGuess.filter((x): x is string => typeof x === 'string').slice(0, MAX_STEPS) : [];
  const kind = KINDS.find((k) => k === a.kind) ?? 'other';
  return { title: text(a.title), summary: text(a.summary), stepsGuess: steps, area: text(a.area), kind };
}
