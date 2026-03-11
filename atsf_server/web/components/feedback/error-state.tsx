interface ErrorStateProps {
  title: string;
  description: string;
}

export function ErrorState({ title, description }: ErrorStateProps) {
  return (
    <div className='rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-6 text-sm'>
      <p className='text-base font-semibold text-rose-100'>{title}</p>
      <p className='mt-2 leading-6 text-rose-100/80'>{description}</p>
    </div>
  );
}
