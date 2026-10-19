import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-navy-900 text-white hover:bg-navy-800',
        secondary: 'border border-line bg-white text-ink hover:bg-navy-50',
        danger: 'bg-danger-700 text-white hover:bg-danger-700/90',
        ghost: 'text-ink hover:bg-navy-50',
      },
      size: { md: 'h-10 px-4 text-sm', sm: 'h-8 px-3 text-sm', icon: 'size-9' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, type = 'button', ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp type={asChild ? undefined : type} className={cn(button({ variant, size }), className)} {...props} />;
}
