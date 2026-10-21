import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn';

const button = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-cream shadow-sm shadow-ink/20 hover:bg-ink-800 hover:shadow-md',
        secondary: 'border border-petrol-800 bg-white text-petrol-800 hover:bg-petrol-50',
        danger: 'bg-danger-700 text-cream shadow-sm shadow-ink/20 hover:bg-danger-700/90 hover:shadow-md',
        ghost: 'text-petrol-800 hover:bg-petrol-50',
        soft: 'bg-neutral-50 text-ink hover:bg-neutral-200/60',
        tint: 'bg-petrol-50 text-petrol-800 font-bold',
      },
      size: { md: 'h-11 px-5 text-sm', sm: 'h-9 px-3.5 text-sm', icon: 'size-11 sm:size-10' },
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
