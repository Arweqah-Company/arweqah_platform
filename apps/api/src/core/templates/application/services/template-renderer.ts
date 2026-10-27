import { Injectable, Logger } from '@nestjs/common';
import { type TemplateContent, type TemplateKind, type TemplateLang, type TemplatePreviewDto } from '@arweqah-platform/shared';
import { AppConfig } from '../../../../config/app-config.service';
import { MessageTemplateRepository } from '../../domain/contracts/message-template.repository';
import { renderEmailPage } from '../../domain/rules/email-layout';
import { escapeHtml, fill, htmlToText, sanitizeEmailBody } from '../../domain/rules/template-rules';
import type { TemplateDefinition, TemplateValues } from '../../domain/types/template.types';
import { LIVE_CACHE_MS } from '../messages/templates.messages';
import { TemplateRegistry } from './template-registry';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface RenderedNotice {
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}

const DEFAULT_COLORS = { band: 'petrol', button: 'petrol' } as const;

/** Values for HTML: escaped, and a line break in a value becomes a line break on the page. */
const forHtml = (values: TemplateValues): TemplateValues => Object.fromEntries(Object.entries(values).map(([k, v]) => [k, escapeHtml(v).replace(/\n/g, '<br>')]));

/**
 * What the senders call: the wording that is live now (the administrator's, else the code's default) filled with real values.
 * A broken edit never stops a message: any failure while using the customised wording falls back to the default.
 */
@Injectable()
export class TemplateRenderer {
  private readonly logger = new Logger(TemplateRenderer.name);
  private readonly cache = new Map<string, { at: number; content: TemplateContent | null }>();

  constructor(
    private readonly registry: TemplateRegistry,
    private readonly repo: MessageTemplateRepository,
    private readonly config: AppConfig,
  ) {}

  invalidate(): void {
    this.cache.clear();
  }

  async renderEmail(key: string, lang: TemplateLang, values: TemplateValues): Promise<RenderedEmail> {
    const def = this.definition('email', key);
    const custom = await this.customised('email', key);
    try {
      return this.emailFrom(def, custom ?? def.defaults, lang, values);
    } catch (error) {
      this.logger.error(`Template ${key} failed, the default wording is sent`, error as Error);
      return this.emailFrom(def, def.defaults, lang, values);
    }
  }

  /** `perLang` holds the values that differ by language (a department's name, a status): they are added over `values` for each language. */
  async renderNotice(key: string, values: TemplateValues, perLang: Partial<Record<TemplateLang, TemplateValues>> = {}): Promise<RenderedNotice> {
    const def = this.definition('notification', key);
    const custom = await this.customised('notification', key);
    const ar = { ...values, ...perLang.ar };
    const en = { ...values, ...perLang.en };
    const pick = (content: TemplateContent) => ({
      titleAr: fill(content.ar.title, ar), titleEn: fill(content.en.title, en), bodyAr: fill(content.ar.body, ar), bodyEn: fill(content.en.body, en),
    });
    try {
      return pick(custom ?? def.defaults);
    } catch (error) {
      this.logger.error(`Template ${key} failed, the default wording is sent`, error as Error);
      return pick(def.defaults);
    }
  }

  /** The wording being edited, filled with the template's example values: what the preview and the test message show. */
  preview(def: TemplateDefinition, content: TemplateContent, lang: TemplateLang): TemplatePreviewDto {
    const values = Object.fromEntries(def.variables.map((v) => [v.name, lang === 'ar' ? v.exampleAr : v.exampleEn]));
    if (def.kind === 'email') {
      const mail = this.emailFrom(def, content, lang, values);
      return { title: mail.subject, html: mail.html, text: mail.text };
    }
    const title = fill(content[lang].title, values);
    const text = fill(content[lang].body, values);
    return { title, text, html: `<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>` };
  }

  private emailFrom(def: TemplateDefinition, content: TemplateContent, lang: TemplateLang, values: TemplateValues): RenderedEmail {
    const part = content[lang];
    const body = sanitizeEmailBody(part.body);
    const link = values.link ?? null;
    const html = renderEmailPage({
      lang,
      bodyHtml: fill(body, forHtml(values)),
      preheader: fill(part.preheader, values),
      buttonText: fill(part.buttonText, values),
      link,
      colors: content.colors ?? def.defaults.colors ?? DEFAULT_COLORS,
      appUrl: this.config.get('APP_URL'),
    });
    const text = fill(htmlToText(body), values) + (link ? `\n\n${link}` : '');
    return { subject: fill(part.title, values), html, text };
  }

  private definition(kind: TemplateKind, key: string): TemplateDefinition {
    const def = this.registry.get(kind, key);
    if (!def) throw new Error(`Unknown message template ${kind}:${key}`);
    return def;
  }

  private async customised(kind: TemplateKind, key: string): Promise<TemplateContent | null> {
    const id = `${kind}:${key}`;
    const hit = this.cache.get(id);
    if (hit && Date.now() - hit.at < LIVE_CACHE_MS) return hit.content;
    try {
      const content = (await this.repo.find(kind, key))?.content ?? null;
      this.cache.set(id, { at: Date.now(), content });
      return content;
    } catch (error) {
      // A message must still go out when the wording cannot be read: the default is sent, and the next message tries again.
      this.logger.error(`Could not read the wording of ${id}, the default is sent`, error as Error);
      return null;
    }
  }
}
