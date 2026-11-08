/**
 * Reads a duration written in Arabic into minutes: «ساعتان», «3 ساعات و12 دقيقة», «ساعة و30 دقيقة», «45 دقيقة». Anything else is 0
 * (the editor reports «مدة غير مفهومة»).
 */
export function durationMinutes(text: string): number {
  return hoursPart(text) + minutesPart(text);
}

function hoursPart(text: string): number {
  if (/ساعتان/.test(text)) return 120;
  const hours = /(\d+)\s*ساع(?:ات|ة)/.exec(text);
  if (hours) return Number(hours[1]) * 60;
  return /(^|\s)ساعة(\s|$)/.test(text) ? 60 : 0;
}

function minutesPart(text: string): number {
  const minutes = /(\d+)\s*دقيقة/.exec(text);
  return minutes ? Number(minutes[1]) : 0;
}
