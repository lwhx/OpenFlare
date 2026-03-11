import { cn } from '@/lib/utils/cn';

interface LoadingStateProps {
  className?: string;
}

export function LoadingState({ className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className='h-4 w-32 animate-pulse rounded bg-white/10' />
      <div className='h-24 animate-pulse rounded-2xl bg-white/5' />
      <div className='h-24 animate-pulse rounded-2xl bg-white/5' />
    </div>
  );
}
