'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { InlineMessage } from '@/components/feedback/inline-message';
import { useAuth } from '@/components/providers/auth-provider';
import { AppCard } from '@/components/ui/app-card';
import { login } from '@/features/auth/api/auth';
import { getPublicStatus } from '@/features/auth/api/public';
import {
  AuthButton,
  AuthFormField,
  AuthInput,
  SecondaryButton,
} from '@/features/auth/components/auth-form-primitives';
import { PublicAuthGuard } from '@/features/auth/components/public-auth-guard';

const TEXT = {
  usernameRequired: '\u8bf7\u8f93\u5165\u7528\u6237\u540d',
  passwordRequired: '\u8bf7\u8f93\u5165\u5bc6\u7801',
  loginFailed: '\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  githubUnavailable: 'GitHub \u767b\u5f55\u5f53\u524d\u4e0d\u53ef\u7528\u3002',
  title: '\u7528\u6237\u767b\u5f55',
  username: '\u7528\u6237\u540d',
  password: '\u5bc6\u7801',
  loginPending: '\u767b\u5f55\u4e2d...',
  login: '\u767b\u5f55',
  githubLogin: 'GitHub \u767b\u5f55',
  forgotPassword: '\u5fd8\u8bb0\u5bc6\u7801\uff1f',
  register: '\u6ce8\u518c',
};

const loginSchema = z.object({
  username: z.string().min(1, TEXT.usernameRequired),
  password: z.string().min(1, TEXT.passwordRequired),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [errorMessage, setErrorMessage] = useState('');
  const redirect = searchParams?.get('redirect') || '/';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const statusQuery = useQuery({
    queryKey: ['public-status'],
    queryFn: getPublicStatus,
  });

  const canUsePasswordRegister =
    (statusQuery.data?.register_enabled ?? false) &&
    (statusQuery.data?.password_register_enabled ?? false);

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      setUser(user);
      router.replace(redirect);
    },
    onError: (error: Error) => {
      setErrorMessage(error.message || TEXT.loginFailed);
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setErrorMessage('');
    loginMutation.mutate(values);
  });

  const handleGitHubLogin = () => {
    const clientId = statusQuery.data?.github_client_id;
    if (!clientId) {
      setErrorMessage(TEXT.githubUnavailable);
      return;
    }

    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('scope', 'user:email');
    window.location.href = authorizeUrl.toString();
  };

  return (
    <PublicAuthGuard>
      <AppCard title={TEXT.title}>
        <form className='space-y-4' onSubmit={handleSubmit}>
          <AuthFormField label={TEXT.username}>
            <AuthInput
              placeholder={TEXT.username}
              {...form.register('username')}
            />
            {form.formState.errors.username ? (
              <span className='text-xs text-[var(--status-danger-foreground)]'>
                {form.formState.errors.username.message}
              </span>
            ) : null}
          </AuthFormField>

          <AuthFormField label={TEXT.password}>
            <AuthInput
              type='password'
              placeholder={TEXT.password}
              {...form.register('password')}
            />
            {form.formState.errors.password ? (
              <span className='text-xs text-[var(--status-danger-foreground)]'>
                {form.formState.errors.password.message}
              </span>
            ) : null}
          </AuthFormField>

          {errorMessage ? (
            <InlineMessage tone='danger' message={errorMessage} />
          ) : null}

          <div className='flex flex-col gap-3 sm:flex-row'>
            <AuthButton type='submit' disabled={loginMutation.isPending}>
              {loginMutation.isPending ? TEXT.loginPending : TEXT.login}
            </AuthButton>
            {statusQuery.data?.github_oauth ? (
              <SecondaryButton
                type='button'
                onClick={handleGitHubLogin}
                className='w-full sm:w-auto'
              >
                {TEXT.githubLogin}
              </SecondaryButton>
            ) : null}
          </div>
        </form>

        <div className='mt-6 flex flex-wrap gap-3 text-sm text-[var(--foreground-secondary)]'>
          <Link
            href='/reset'
            className='text-[var(--brand-primary)] transition hover:opacity-80'
          >
            {TEXT.forgotPassword}
          </Link>
          {canUsePasswordRegister ? (
            <>
              <span>|</span>
              <Link
                href='/register'
                className='text-[var(--brand-primary)] transition hover:opacity-80'
              >
                {TEXT.register}
              </Link>
            </>
          ) : null}
        </div>
      </AppCard>
    </PublicAuthGuard>
  );
}
