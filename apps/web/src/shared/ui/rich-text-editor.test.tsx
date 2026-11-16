import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RichText } from './rich-text';
import { RichTextEditor } from './rich-text-editor';

describe('Rich text (FR-134)', () => {
  it('offers the formatting buttons and an editable text area named by its label', async () => {
    render(<RichTextEditor value="" onChange={() => undefined} label="التعليمات" lang="ar" />);
    expect(await screen.findByRole('textbox', { name: 'التعليمات' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(6);
  });

  it('shows formatted text but drops scripts, images, event attributes and unsafe links', () => {
    const { container } = render(<RichText html={'<p>نص <strong>مهم</strong></p><script>1</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">bad</a><a href="https://example.com">ok</a>'} />);
    expect(container.querySelector('strong')).toHaveTextContent('مهم');
    expect(container.querySelector('script, img')).toBeNull();
    const links = [...container.querySelectorAll('a')];
    expect(links.find((a) => a.textContent === 'bad')?.getAttribute('href')).toBeNull();
    expect(links.find((a) => a.textContent === 'ok')).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
