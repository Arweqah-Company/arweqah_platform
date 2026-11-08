/** The five sections of a career path, always in this order (the evaluation section waits for the performance module: it says so). */
export const CAREER_SECTION_KEYS = ['description', 'evaluation', 'development', 'learning', 'required'] as const;
export type CareerSectionKey = (typeof CAREER_SECTION_KEYS)[number];
