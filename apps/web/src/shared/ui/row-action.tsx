import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '../lib/cn';
import { Button } from './button';

/**
 * One action on a table row, as an icon. The name (the label) is its accessible name and its tooltip, so no action is icon-only for a
 * screen reader; a `to` makes it a link (view, edit pages), otherwise it is a button.
 */
export function RowAction({ label, icon: Icon, to, onClick, danger, disabled }: { label: string; icon: LucideIcon; to?: string; onClick?: () => void; danger?: boolean; disabled?: boolean }) {
  const className = cn(danger && 'text-danger-text hover:bg-danger-50');
  const icon = <Icon className="size-5" aria-hidden />;
  if (to) {
    return (
      <Button asChild variant="ghost" size="icon" className={className}>
        <Link to={to} aria-label={label} title={label}>{icon}</Link>
      </Button>
    );
  }
  return (
    <Button variant="ghost" size="icon" className={className} aria-label={label} title={label} disabled={disabled} onClick={onClick}>
      {icon}
    </Button>
  );
}
