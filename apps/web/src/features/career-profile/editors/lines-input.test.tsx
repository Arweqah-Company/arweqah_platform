import type { CareerContent } from '@arweqah-platform/shared';
import { fireEvent, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { careerContent } from '../../../../test/career-fixtures';
import { renderPage } from '../../../../test/render';
import { DescriptionEditor } from './description-editor';
import { RequiredEditor } from './required-editor';

function Host({ editor: Editor }: { editor: typeof DescriptionEditor }) {
  const [content, setContent] = useState<CareerContent>(careerContent);
  return <><Editor content={content} onChange={setContent} /><output data-testid="doc">{JSON.stringify(content)}</output></>;
}

describe('one line per item textareas (FR-113)', () => {
  it('keeps the space and the new empty line the person has just typed, and stores the clean lines', () => {
    renderPage(<Host editor={DescriptionEditor} />);
    const box = screen.getAllByRole('textbox').find((b) => (b as HTMLTextAreaElement).value.includes('تحليل المستهدفات')) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: `${box.value} ` } });
    expect(box.value.endsWith(' ')).toBe(true);
    fireEvent.change(box, { target: { value: `${box.value}\n` } });
    expect(box.value.endsWith(' \n')).toBe(true);
    fireEvent.change(box, { target: { value: `${box.value}خطوة جديدة` } });
    expect(screen.getByTestId('doc').textContent).toContain('"خطوة جديدة"');
  });

  it('the required lines behave the same way', () => {
    renderPage(<Host editor={RequiredEditor} />);
    const box = screen.getAllByRole('textbox').find((b) => (b as HTMLTextAreaElement).value === careerContent.required[0]?.lines.join('\n')) as HTMLTextAreaElement;
    fireEvent.change(box, { target: { value: `${box.value}\n` } });
    expect(box.value.endsWith('\n')).toBe(true);
  });
});
