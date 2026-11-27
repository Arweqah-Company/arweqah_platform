import { Injectable, Logger } from '@nestjs/common';
import type { ProblemContext } from '@arweqah-platform/shared';
import { z } from 'zod';
import { FilesService } from '../../../../core/files/application/files.service';
import { AiService } from '../../../../core/integrations/application/services/ai.service';
import type { AiImage } from '../../../../core/integrations/domain/contracts/ai-client';
import { cleanModelText } from '../../domain/rules/problem-report.rules';
import type { ProblemAnalysis } from '../../domain/types/problem-report.types';
import { ANALYSIS_SYSTEM, analysisUser } from '../messages/problem-report.messages';

const ANALYSIS_TIMEOUT_MS = 15_000;

const answerSchema = z.strictObject({
  title: z.string(),
  summary: z.string(),
  stepsGuess: z.array(z.string()).max(6),
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

/** Asks the AI service to read a problem report. Never throws: a report with no reading is still a report. */
@Injectable()
export class ProblemReportAnalyzer {
  private readonly logger = new Logger(ProblemReportAnalyzer.name);

  constructor(
    private readonly ai: AiService,
    private readonly files: FilesService,
  ) {}

  async analyze(input: AnalysisInput): Promise<ProblemAnalysis | null> {
    try {
      if (!(await this.ai.isActive())) return null;
      const image = await this.image(input);
      const question = { system: ANALYSIS_SYSTEM, user: analysisUser(input.note, input.context, image !== null), userWithoutImages: analysisUser(input.note, input.context, false), schema: answerSchema, maxTokens: 900, images: image ? [image] : undefined };
      const answer = await this.within(this.ai.jsonOf(question));
      return this.clean(answer.value);
    } catch (error) {
      this.logger.warn(`Problem report not analysed: ${error instanceof Error ? error.message : 'unknown'}`);
      return null;
    }
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
