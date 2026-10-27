import type { TemplateArea, TemplateContent, TemplateKind } from '@arweqah-platform/shared';

export interface VariableDefinition {
  name: string;
  descriptionAr: string;
  descriptionEn: string;
  exampleAr: string;
  exampleEn: string;
  /** The message cannot be saved without it. `link` counts as present when the button has a label. */
  required?: boolean;
}

/** One message the code sends: its variables (what the code can fill) and its default wording. */
export interface TemplateDefinition {
  key: string;
  kind: TemplateKind;
  area: TemplateArea;
  nameAr: string;
  nameEn: string;
  descriptionAr: string;
  descriptionEn: string;
  variables: VariableDefinition[];
  defaults: TemplateContent;
}

export type TemplateValues = Record<string, string>;
