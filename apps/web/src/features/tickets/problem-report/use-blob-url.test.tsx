import { render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBlobUrl } from './use-blob-url';

const original = { make: URL.createObjectURL, revoke: URL.revokeObjectURL };
const picture = new Blob(['a']);

function Shown() {
  const url = useBlobUrl(picture);
  return <img alt="shot" src={url ?? undefined} />;
}

describe('The address of a screenshot kept in the browser (FR-199)', () => {
  afterEach(() => Object.assign(URL, { createObjectURL: original.make, revokeObjectURL: original.revoke }));

  it('is never revoked while it is shown, even where React runs every effect twice (development), and is released when the picture goes', async () => {
    const revoked: string[] = [];
    let made = 0;
    URL.createObjectURL = () => `blob:shot-${(made += 1)}`;
    URL.revokeObjectURL = (url: string) => { revoked.push(url); };
    const { getByAltText, unmount } = render(<StrictMode><Shown /></StrictMode>);
    const shown = getByAltText('shot').getAttribute('src') ?? '';
    expect(shown).toMatch(/^blob:shot-/);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(revoked).not.toContain(shown);
    unmount();
    await waitFor(() => expect(revoked).toContain(shown));
  });
});
