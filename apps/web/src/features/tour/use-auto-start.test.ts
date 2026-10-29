import type { TourDto } from '@arweqah-platform/shared';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAutoStart } from './use-auto-start';

const tour = (over: Partial<TourDto> = {}): TourDto => ({ tour: 'general', status: 'none', steps: [{ key: 'welcome', titleAr: null, titleEn: null, bodyAr: null, bodyEn: null }], newSteps: [], ...over });

function setup(data: Parameters<typeof useAutoStart>[0]['data'], running = false) {
  const begin = vi.fn();
  const dismiss = vi.fn();
  const hook = renderHook((props: { running: boolean }) => useAutoStart({ data, running: props.running, begin, dismiss }), { initialProps: { running } });
  return { begin, dismiss, ...hook };
}

describe('useAutoStart (FR-67)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('starts a tour nobody has seen, once, after a short pause', () => {
    const { begin, rerender } = setup({ general: tour(), admin: undefined });
    expect(begin).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(begin).toHaveBeenCalledWith('general', expect.anything(), false);
    rerender({ running: false });
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(begin).toHaveBeenCalledTimes(1);
  });

  it('keeps the administration tour until the general one is done', () => {
    const { begin } = setup({ general: tour(), admin: tour({ tour: 'admin' }) });
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(begin).toHaveBeenCalledTimes(1);
    expect(begin).toHaveBeenCalledWith('general', expect.anything(), false);
    const done = setup({ general: tour({ status: 'completed' }), admin: tour({ tour: 'admin' }) });
    act(() => { vi.advanceTimersByTime(1_000); });
    expect(done.begin).toHaveBeenCalledWith('admin', expect.anything(), false);
  });

  it('does not start while a tour is playing, nor a tour without steps', () => {
    const running = setup({ general: tour(), admin: undefined }, true);
    const empty = setup({ general: tour({ steps: [] }), admin: undefined });
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(running.begin).not.toHaveBeenCalled();
    expect(empty.begin).not.toHaveBeenCalled();
  });

  it('offers «what’s new» to a person who finished before, and «later» marks it seen', () => {
    const { result, begin, dismiss } = setup({ general: tour({ status: 'completed', newSteps: ['tickets'] }), admin: undefined });
    expect(result.current.whatsNew).toEqual({ tour: 'general', count: 1 });
    act(() => { vi.advanceTimersByTime(2_000); });
    expect(begin).not.toHaveBeenCalled();
    act(() => result.current.start('general'));
    expect(begin).toHaveBeenCalledWith('general', expect.anything(), true);
    act(() => result.current.later('general'));
    expect(dismiss).toHaveBeenCalledWith('general');
    expect(result.current.whatsNew).toBeNull();
  });

  it('offers nothing when there is nothing new', () => {
    expect(setup({ general: tour({ status: 'completed' }), admin: undefined }).result.current.whatsNew).toBeNull();
  });
});
