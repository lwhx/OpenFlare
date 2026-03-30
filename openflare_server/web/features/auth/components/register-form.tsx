'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { InlineMessage } from '@/components/feedback/inline-message';
import { TurnstileWidget } from '@/components/forms/turnstile-widget';
import { AppCard } from '@/components/ui/app-card';
import {
  register as registerUser,
  sendEmailVerification,
} from '@/features/auth/api/auth';
import { getPublicStatus } from '@/features/auth/api/public';
import {
  AuthButton,
  AuthFormField,
  AuthInput,
  SecondaryButton,
} from '@/features/auth/components/auth-form-primitives';
import { PublicAuthGuard } from '@/features/auth/components/public-auth-guard';

const TEXT = {
  title: '\u65b0\u7528\u6237\u6ce8\u518c',
  description:
    '\u517c\u5bb9\u73b0\u6709\u5bc6\u7801\u6ce8\u518c\u94fe\u8def\uff0c\u540e\u7eed\u53ef\u7ee7\u7eed\u6269\u5c55\u7b2c\u4e09\u65b9\u6ce8\u518c\u3002',
  usernameRequired: '\u8bf7\u8f93\u5165\u7528\u6237\u540d',
  usernameTooLong: '\u7528\u6237\u540d\u6700\u957f 12 \u4f4d',
  passwordTooShort: '\u5bc6\u7801\u81f3\u5c11 8 \u4f4d',
  passwordTooLong: '\u5bc6\u7801\u6700\u957f 20 \u4f4d',
  passwordRepeatRequired: '\u8bf7\u518d\u6b21\u8f93\u5165\u5bc6\u7801',
  passwordMismatch: '\u4e24\u6b21\u8f93\u5165\u7684\u5bc6\u7801\u4e0d\u4e00\u81f4',
  emailInvalid: '\u8bf7\u8f93\u5165\u6709\u6548\u90ae\u7bb1\u5730\u5740',
  codeRequired: '\u8bf7\u8f93\u5165\u9a8c\u8bc1\u7801',
  registerFailed: '\u6ce8\u518c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  emailRequired: '\u8bf7\u8f93\u5165\u90ae\u7bb1\u5730\u5740',
  verificationSent:
    '\u9a8c\u8bc1\u7801\u53d1\u9001\u6210\u529f\uff0c\u8bf7\u68c0\u67e5\u90ae\u7bb1\u3002',
  verificationFailed:
    '\u9a8c\u8bc1\u7801\u53d1\u9001\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002',
  turnstileRequired: '\u8bf7\u5148\u5b8c\u6210\u4eba\u673a\u9a8c\u8bc1\u3002',
  registerClosed:
    '\u7ba1\u7406\u5458\u5df2\u5173\u95ed\u65b0\u7528\u6237\u6ce8\u518c\u3002',
  passwordRegisterClosed:
    '\u7ba1\u7406\u5458\u5df2\u5173\u95ed\u5bc6\u7801\u6ce8\u518c\uff0c\u8bf7\u4f7f\u7528\u7b2c\u4e09\u65b9\u767b\u5f55\u5165\u53e3\u5b8c\u6210\u6ce8\u518c\u3002',
  hasAccount: '\u5df2\u6709\u8d26\u53f7\uff1f',
  backToLogin:
    '\u8fd4\u56de\u767b\u5f55\u9875\u67e5\u770b\u53ef\u7528\u5165\u53e3\uff1a',
  clickLogin: '\u70b9\u51fb\u767b\u5f55',
  username: '\u7528\u6237\u540d',
  usernameHint: '\u6700\u957f 12 \u4f4d',
  password: '\u5bc6\u7801',
  passwordHint: '\u6700\u77ed 8 \u4f4d\uff0c\u6700\u957f 20 \u4f4d',
  passwordConfirm: '\u786e\u8ba4\u5bc6\u7801',
  email: '\u90ae\u7bb1\u5730\u5740',
  emailCode: '\u90ae\u7bb1\u9a8c\u8bc1\u7801',
  getCode: '\u83b7\u53d6\u9a8c\u8bc1\u7801',
  gettingCode: '\u53d1\u9001\u4e2d...',
  register: '\u6ce8\u518c',
  registering: '\u6ce8\u518c\u4e2d...',
};

const baseSchemaObject = z.object({
  username: z.string().min(1, TEXT.usernameRequired).max(12, TEXT.usernameTooLong),
  password: z.string().min(8, TEXT.passwordTooShort).max(20, TEXT.passwordTooLong),
  password2: z.string().min(8, TEXT.passwordRepeatRequired),
  email: z.string().optional(),
  verification_code: z.string().optional(),
});

const baseSchema = baseSchemaObject.refine(
  (data) => data.password === data.password2,
  {
    message: TEXT.passwordMismatch,
    path: ['password2'],
  },
);

type RegisterFormValues = z.infer<typeof baseSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [turnstileToken, setTurnstileToken] = useState('');
  const [message, setMessage] = useState<{
    tone: 'success' | 'danger' | 'info';
    text: string;
  } | null>(null);

  const statusQuery = useQuery({
    queryKey: ['public-status'],
    queryFn: getPublicStatus,
  });

  const needsEmailVerification = statusQuery.data?.email_verification ?? false;
  const needsTurnstile = statusQuery.data?.turnstile_check ?? false;
  const registerEnabled = statusQuery.data?.register_enabled ?? false;
  const passwordRegisterEnabled =
    statusQuery.data?.password_register_enabled ?? false;

  const schema = useMemo(() => {
    if (!needsEmailVerification) {
      return baseSchema;
    }

    return baseSchemaObject
      .extend({
        email: z.string().email(TEXT.emailInvalid),
        verification_code: z.string().min(1, TEXT.codeRequired),
      })
      .refine((data) => data.password === data.password2, {
        message: TEXT.passwordMismatch,
        path: ['password2'],
      });
  }, [needsEmailVerification]);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '',
      password: '',
      password2: '',
      email: '',
      verification_code: '',
    },
  });

  const registerMutation = useMutation({
    mutationFn: (values: RegisterFormValues) =>
      registerUser(
        {
          username: values.username,
          password: values.password,
          email: values.email,
          verification_code: values.verification_code,
        },
        turnstileToken || undefined,
      ),
    onSuccess: () => {
      router.replace('/login');
    },
    onError: (error: Error) => {
      setMessage({ tone: 'danger', text: error.message || TEXT.registerFailed });
    },
  });

  const verificationMutation = useMutation({
    mutationFn: async () => {
      const email = form.getValues('email');
      if (!email) {
        form.setError('email', { message: TEXT.emailRequired });
        return;
      }
      await sendEmailVerification(email, turnstileToken || undefined);
    },
    onSuccess: () => {
      setMessage({ tone: 'success', text: TEXT.verificationSent });
    },
    onError: (error: Error) => {
      setMessage({
        tone: 'danger',
        text: error.message || TEXT.verificationFailed,
      });
    },
  });

  const handleSubmit = form.handleSubmit((values) => {
    setMessage(null);
    if (needsTurnstile && !turnstileToken) {
      setMessage({ tone: 'info', text: TEXT.turnstileRequired });
      return;
    }
    registerMutation.mutate(values);
  });

  return (
    <PublicAuthGuard>
      <AppCard title={TEXT.title} description={TEXT.description}>
        {!registerEnabled ? (
          <div className='space-y-4'>
            <InlineMessage tone='info' message={TEXT.registerClosed} />
            <div className='text-sm text-[var(--foreground-secondary)]'>
              {TEXT.hasAccount}
              <Link
                href='/login'
                className='ml-2 text-[var(--brand-primary)] transition hover:opacity-80'
              >
                {TEXT.clickLogin}
              </Link>
            </div>
          </div>
        ) : !passwordRegisterEnabled ? (
          <div className='space-y-4'>
            <InlineMessage tone='info' message={TEXT.passwordRegisterClosed} />
            <div className='text-sm text-[var(--foreground-secondary)]'>
              {TEXT.backToLogin}
              <Link
                href='/login'
                className='ml-2 text-[var(--brand-primary)] transition hover:opacity-80'
              >
                {TEXT.clickLogin}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <form className='space-y-4' onSubmit={handleSubmit}>
              <AuthFormField label={TEXT.username} hint={TEXT.usernameHint}>
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

              <AuthFormField label={TEXT.password} hint={TEXT.passwordHint}>
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

              <AuthFormField label={TEXT.passwordConfirm}>
                <AuthInput
                  type='password'
                  placeholder={TEXT.passwordConfirm}
                  {...form.register('password2')}
                />
                {form.formState.errors.password2 ? (
                  <span className='text-xs text-[var(--status-danger-foreground)]'>
                    {form.formState.errors.password2.message}
                  </span>
                ) : null}
              </AuthFormField>

              {needsEmailVerification ? (
                <>
                  <AuthFormField label={TEXT.email}>
                    <AuthInput
                      type='email'
                      placeholder={TEXT.email}
                      {...form.register('email')}
                    />
                    {form.formState.errors.email ? (
                      <span className='text-xs text-[var(--status-danger-foreground)]'>
                        {form.formState.errors.email.message}
                      </span>
                    ) : null}
                  </AuthFormField>

                  <AuthFormField label={TEXT.emailCode}>
                    <div className='flex flex-col gap-3 sm:flex-row'>
                      <AuthInput
                        placeholder={TEXT.emailCode}
                        className='flex-1'
                        {...form.register('verification_code')}
                      />
                      <SecondaryButton
                        type='button'
                        onClick={() => {
                          if (needsTurnstile && !turnstileToken) {
                            setMessage({
                              tone: 'info',
                              text: TEXT.turnstileRequired,
                            });
                            return;
                          }
                          setMessage(null);
                          verificationMutation.mutate();
                        }}
                        disabled={verificationMutation.isPending}
                      >
                        {verificationMutation.isPending
                          ? TEXT.gettingCode
                          : TEXT.getCode}
                      </SecondaryButton>
                    </div>
                    {form.formState.errors.verification_code ? (
                      <span className='text-xs text-[var(--status-danger-foreground)]'>
                        {form.formState.errors.verification_code.message}
                      </span>
                    ) : null}
                  </AuthFormField>
                </>
              ) : null}

              {needsTurnstile && statusQuery.data?.turnstile_site_key ? (
                <TurnstileWidget
                  siteKey={statusQuery.data.turnstile_site_key}
                  onVerify={(token) => setTurnstileToken(token)}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => setTurnstileToken('')}
                />
              ) : null}

              {message ? (
                <InlineMessage tone={message.tone} message={message.text} />
              ) : null}

              <AuthButton type='submit' disabled={registerMutation.isPending}>
                {registerMutation.isPending ? TEXT.registering : TEXT.register}
              </AuthButton>
            </form>

            <div className='mt-6 text-sm text-[var(--foreground-secondary)]'>
              {TEXT.hasAccount}
              <Link
                href='/login'
                className='ml-2 text-[var(--brand-primary)] transition hover:opacity-80'
              >
                {TEXT.clickLogin}
              </Link>
            </div>
          </>
        )}
      </AppCard>
    </PublicAuthGuard>
  );
}
