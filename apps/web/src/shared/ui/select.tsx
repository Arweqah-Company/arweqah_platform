import { Children, isValidElement, type ChangeEvent, type OptionHTMLAttributes, type ReactElement, type ReactNode, type SelectHTMLAttributes } from 'react';
import { Combobox, type ComboboxOption } from './combobox';

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  value?: string;
  onChange?: (event: Pick<ChangeEvent<HTMLSelectElement>, 'target'>) => void;
  children: ReactNode;
  /** Shows the search box in the popup, for a long list. */
  searchable?: boolean;
};

function optionsOf(children: ReactNode): ComboboxOption[] {
  return Children.toArray(children)
    .filter((c): c is ReactElement<OptionHTMLAttributes<HTMLOptionElement>> => isValidElement(c) && c.type === 'option')
    .map((c) => ({ value: String(c.props.value ?? ''), label: Children.toArray(c.props.children).join('') }));
}

/**
 * The form select: the same popup as `Combobox` (rounded, petrol selection, check mark), with the search box only when `searchable`.
 * Keeps the native API (`<option>` children, `onChange(e)` with `e.target.value`) so call sites stay simple.
 */
export function Select({ value = '', onChange, children, id, className, disabled, searchable = false, 'aria-label': label, ...rest }: SelectProps) {
  return (
    <Combobox
      id={id}
      label={label ?? ''}
      className={className}
      value={value}
      disabled={disabled}
      searchable={searchable}
      options={optionsOf(children)}
      invalid={rest['aria-invalid'] === true || rest['aria-invalid'] === 'true'}
      aria-describedby={rest['aria-describedby']}
      aria-required={rest['aria-required'] === true || rest['aria-required'] === 'true'}
      onBlur={rest.onBlur as (() => void) | undefined}
      onChange={(next) => onChange?.({ target: { value: next ?? '' } as HTMLSelectElement })}
    />
  );
}
