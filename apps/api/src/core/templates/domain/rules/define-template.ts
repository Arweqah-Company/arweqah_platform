import type { TemplateArea, TemplateContent } from '@arweqah-platform/shared';
import type { TemplateDefinition, VariableDefinition } from '../types/template.types';

interface NoticeSpec {
  key: string;
  area: TemplateArea;
  /** [Arabic, English] name and "sent when" description shown in the list. */
  name: [string, string];
  when: [string, string];
  variables: VariableDefinition[];
  title: [string, string];
  body: [string, string];
}

const none = { preheader: '', buttonText: '' };

/** A notification template: a title and a body in each language, the wording being today's text with `{{variables}}` where values go. */
export function noticeTemplate(spec: NoticeSpec): TemplateDefinition {
  const defaults: TemplateContent = { ar: { ...none, title: spec.title[0], body: spec.body[0] }, en: { ...none, title: spec.title[1], body: spec.body[1] } };
  return { key: spec.key, kind: 'notification', area: spec.area, nameAr: spec.name[0], nameEn: spec.name[1], descriptionAr: spec.when[0], descriptionEn: spec.when[1], variables: spec.variables, defaults };
}

/** A variable with the same example in both languages (a number, a code). */
export const variable = (name: string, description: [string, string], example: string, required = false): VariableDefinition => ({
  name, descriptionAr: description[0], descriptionEn: description[1], exampleAr: example, exampleEn: example, required,
});

/** A variable whose example differs by language (a name, a status). */
export const localizedVariable = (name: string, description: [string, string], example: [string, string]): VariableDefinition => ({
  name, descriptionAr: description[0], descriptionEn: description[1], exampleAr: example[0], exampleEn: example[1],
});
