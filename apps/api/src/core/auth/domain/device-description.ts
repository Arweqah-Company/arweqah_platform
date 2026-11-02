/** «Chrome on Windows», from the browser's own words; empty when it says nothing we know. */
export function describeDevice(userAgent: string | null | undefined): string {
  if (!userAgent) return '';
  const browser = browserOf(userAgent);
  const system = systemOf(userAgent);
  return [browser, system].filter(Boolean).join(' / ');
}

const BROWSERS: [RegExp, string][] = [[/Edg(e|A|iOS)?\//, 'Edge'], [/OPR\/|Opera/, 'Opera'], [/Firefox\/|FxiOS\//, 'Firefox'], [/Chrome\/|CriOS\//, 'Chrome'], [/Safari\//, 'Safari']];
const SYSTEMS: [RegExp, string][] = [[/Windows/, 'Windows'], [/Android/, 'Android'], [/iPhone|iPad|iPod/, 'iOS'], [/Mac OS X|Macintosh/, 'macOS'], [/CrOS/, 'ChromeOS'], [/Linux/, 'Linux']];

const browserOf = (ua: string): string => BROWSERS.find(([pattern]) => pattern.test(ua))?.[1] ?? '';
const systemOf = (ua: string): string => SYSTEMS.find(([pattern]) => pattern.test(ua))?.[1] ?? '';

/** The address with its last part hidden: 192.168.4.x, or the first three groups of an IPv6 address. */
export function maskIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  if (ip.includes('.') && !ip.includes(':')) return ip.split('.').slice(0, 3).concat('x').join('.');
  if (ip.startsWith('::ffff:') && ip.includes('.')) return maskIp(ip.slice(7));
  return `${ip.split(':').slice(0, 3).join(':')}:…`;
}
