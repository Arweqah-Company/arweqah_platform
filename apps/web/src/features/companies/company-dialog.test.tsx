import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '../../../test/render';
import { CompanyDialog } from './company-dialog';

const open = () => renderRoute([{ path: '/', element: <CompanyDialog company={null} open onOpenChange={() => undefined} /> }], '/');

describe('Company form validation (while typing and when leaving a field)', () => {
  it('stays quiet at first, then explains each field as it is edited or left', async () => {
    open();
    await screen.findByRole('dialog');
    expect(screen.queryByText('هذا الحقل مطلوب.')).not.toBeInTheDocument();
    fireEvent.blur(screen.getByLabelText('الاسم بالعربي *'));
    expect(await screen.findByText('هذا الحقل مطلوب.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('الاسم بالإنجليزي *'), { target: { value: 'A' } });
    expect(await screen.findByText('يجب ألا يقل عن 2 أحرف.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('الرمز *'), { target: { value: 'a b' } });
    expect(await screen.findByText(/رمز الشركة غير صالح/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('الرمز *'), { target: { value: 'ARW' } });
    expect(screen.queryByText(/رمز الشركة غير صالح/)).not.toBeInTheDocument();
  });
});
