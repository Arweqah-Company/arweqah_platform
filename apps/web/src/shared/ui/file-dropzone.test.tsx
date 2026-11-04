import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { acceptsFile, FileDropzone } from './file-dropzone';

const MB = 1024 * 1024;
const csv = new File(['a'], 'rows.csv', { type: 'text/csv' });
const pdf = new File(['a'], 'doc.pdf', { type: 'application/pdf' });

describe('FileDropzone is the one place a file is picked (standing rule 6)', () => {
  it('shows the upload icon, the prompt and the size limit in a dashed box', () => {
    render(<FileDropzone label="اختر" maxBytes={5 * MB} onFiles={() => undefined} />);
    const box = screen.getByText('أسقط الملف هنا، أو انقر للتصفح').closest('label') as HTMLElement;
    expect(box).toHaveClass('border-dashed', 'bg-petrol-50/40');
    expect(box.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(screen.getByText('حتى 5 ميجابايت')).toBeInTheDocument();
    expect(screen.getByLabelText('اختر')).toHaveAttribute('type', 'file');
  });

  it('hands over what was chosen or dropped, and only the files of the accepted type', () => {
    const onFiles = vi.fn();
    render(<FileDropzone label="اختر" accept=".csv" multiple onFiles={onFiles} />);
    fireEvent.change(screen.getByLabelText('اختر'), { target: { files: [csv] } });
    expect(onFiles).toHaveBeenLastCalledWith([csv]);
    fireEvent.drop(screen.getByText('أسقط الملفات هنا، أو انقر للتصفح').closest('label') as HTMLElement, { dataTransfer: { files: [pdf] } });
    expect(onFiles).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('alert')).toHaveTextContent('نوع الملف غير مسموح');
  });

  it('refuses a file over the limit with the limit in the message', () => {
    const onFiles = vi.fn();
    render(<FileDropzone label="اختر" maxBytes={2} onFiles={onFiles} />);
    fireEvent.change(screen.getByLabelText('اختر'), { target: { files: [new File(['abc'], 'big.txt')] } });
    expect(onFiles).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('أكبر من الحد المسموح');
  });

  it('is locked while busy and says so', () => {
    render(<FileDropzone label="اختر" busy onFiles={() => undefined} />);
    expect(screen.getByText('جارٍ الرفع…')).toBeInTheDocument();
    expect(screen.getByLabelText('اختر')).toBeDisabled();
  });

  it('matches extensions, exact types and type families', () => {
    expect(acceptsFile(csv, '.xlsx,.csv')).toBe(true);
    expect(acceptsFile(pdf, 'image/*')).toBe(false);
    expect(acceptsFile(new File(['x'], 'a.png', { type: 'image/png' }), 'image/*')).toBe(true);
    expect(acceptsFile(pdf, 'application/pdf')).toBe(true);
    expect(acceptsFile(pdf)).toBe(true);
  });
});
