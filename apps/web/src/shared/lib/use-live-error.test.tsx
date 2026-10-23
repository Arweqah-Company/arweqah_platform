import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useLiveError } from './use-live-error';

const needsText = (value: string) => (value.trim() ? undefined : 'required');

describe('useLiveError (validation while typing or when leaving a field)', () => {
  it('stays quiet until the person touches the field', () => {
    const { result } = renderHook(() => useLiveError('', needsText));
    expect(result.current.error).toBeUndefined();
  });

  it('shows the error when the field is left empty', () => {
    const { result } = renderHook(() => useLiveError('', needsText));
    act(() => result.current.onBlur());
    expect(result.current.error).toBe('required');
  });

  it('follows the value while typing, and clears when it becomes valid', () => {
    const { result, rerender } = renderHook(({ value }) => useLiveError(value, needsText), { initialProps: { value: 'a' } });
    expect(result.current.error).toBeUndefined();
    rerender({ value: '' }); // the person erased what they typed
    expect(result.current.error).toBe('required');
    rerender({ value: 'abc' });
    expect(result.current.error).toBeUndefined();
  });
});
