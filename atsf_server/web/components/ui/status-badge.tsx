import { cn } from '@/lib/utils/cn';

const variantClasses = {
  success: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-200',
  warning: 'border-amber-400/25 bg-amber-500/15 text-amber-200',
  danger: 'border-rose-400/25 bg-rose-500/15 text-rose-200',
  info: 'border-sky-400/25 bg-sky-500/15 text-sky-200',
} as const;

interface StatusBadgeProps {
  label: string;
  variant?: keyof typeof variantClasses;
  className?: string;
}

export function StatusBadge({
  label,
  variant = 'info',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide',
        variantClasses[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
