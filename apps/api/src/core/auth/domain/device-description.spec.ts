import { describe, expect, it } from 'vitest';
import { describeDevice, maskIp } from './device-description';

describe('describeDevice and maskIp (security page)', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', 'Chrome / Windows'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36 Edg/126.0', 'Edge / Windows'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15', 'Safari / macOS'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', 'Safari / iOS'],
    ['Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', 'Chrome / Android'],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0', 'Firefox / Linux'],
    ['curl/8.5.0', ''],
    [null, ''],
  ])('%s → %s', (agent, expected) => {
    expect(describeDevice(agent)).toBe(expected);
  });

  it('hides the last part of an address', () => {
    expect(maskIp('192.168.4.77')).toBe('192.168.4.x');
    expect(maskIp('::ffff:10.1.2.3')).toBe('10.1.2.x');
    expect(maskIp('2001:db8:85a3:8d3:1319:8a2e:370:7348')).toBe('2001:db8:85a3:…');
    expect(maskIp(null)).toBeNull();
  });
});
