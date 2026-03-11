import Link from 'next/link';
import type { ReactNode } from 'react';

import { publicEnv } from '@/lib/env/public-env';

interface PublicShellProps {
  children: ReactNode;
}

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className='flex min-h-screen items-center justify-center px-4 py-12'>
      <div className='w-full max-w-3xl rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-panel)]/85 p-8 shadow-[var(--shadow-soft)] backdrop-blur'>
        <div className='mb-8 flex flex-col gap-4 border-b border-[var(--border-default)] pb-6 md:flex-row md:items-end md:justify-between'>
          <div>
            <p className='text-sm font-medium uppercase tracking-[0.24em] text-sky-300'>ATSFlare</p>
            <h1 className='mt-2 text-3xl font-semibold text-white'>管理端改造进行中</h1>
            <p className='mt-2 text-sm leading-6 text-[var(--foreground-secondary)]'>
              认证流程将在阶段 2 接入。当前页面用于承载入口骨架与路由占位。
            </p>
          </div>
          <div className='text-sm text-[var(--foreground-secondary)]'>
            <span className='rounded-full border border-[var(--border-default)] px-3 py-1.5'>
              {publicEnv.appVersion}
            </span>
          </div>
        </div>

        <div className='space-y-6'>{children}</div>

        <div className='mt-8 border-t border-[var(--border-default)] pt-6 text-sm text-[var(--foreground-secondary)]'>
          <Link href='/' className='text-sky-300 transition hover:text-sky-200'>
            返回新版总览
          </Link>
        </div>
      </div>
    </div>
  );
}
