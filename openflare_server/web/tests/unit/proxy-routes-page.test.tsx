import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ThemeProvider } from '@/components/providers/theme-provider';
import { ProxyRoutesPage } from '@/features/proxy-routes/components/proxy-routes-page';

describe('ProxyRoutesPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubMatchMedia() {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  }

  function renderProxyRoutesPage() {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ProxyRoutesPage />
        </ThemeProvider>
      </QueryClientProvider>,
    );
  }

  function buildBaseFetchStub({
    managedDomains,
    origins = [],
    certificates = [{ id: 1, name: 'example-cert', not_after: null }],
    matchResult,
  }: {
    managedDomains: Array<Record<string, unknown>>;
    origins?: Array<Record<string, unknown>>;
    certificates?: Array<Record<string, unknown>>;
    matchResult?: Record<string, unknown>;
  }) {
    return vi.fn((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes('/proxy-routes/')) {
        return Promise.resolve(
          new Response(JSON.stringify({ success: true, message: '', data: [] })),
        );
      }

      if (url.includes('/managed-domains/match?')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              message: '',
              data:
                matchResult ??
                {
                  domain: 'a.example.com',
                  matched: true,
                  candidate: {
                    managed_domain_id: 2,
                    domain: 'a.example.com',
                    match_type: 'exact',
                    certificate_id: 1,
                    certificate_name: 'example-cert',
                  },
                  candidates: [],
                },
            }),
          ),
        );
      }

      if (url.includes('/managed-domains/')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              message: '',
              data: managedDomains,
            }),
          ),
        );
      }

      if (url.includes('/origins/')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              message: '',
              data: origins,
            }),
          ),
        );
      }

      if (url.includes('/tls-certificates/')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              success: true,
              message: '',
              data: certificates,
            }),
          ),
        );
      }

      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    });
  }

  it('shows wildcard subdomain input after selecting a wildcard website', async () => {
    stubMatchMedia();

    vi.stubGlobal(
      'fetch',
      buildBaseFetchStub({
        managedDomains: [
          {
            id: 1,
            domain: '*.example.com',
            cert_id: 1,
            enabled: true,
            remark: '',
            created_at: '2026-03-20T08:00:00Z',
            updated_at: '2026-03-20T08:00:00Z',
          },
          {
            id: 2,
            domain: 'a.example.com',
            cert_id: 1,
            enabled: true,
            remark: '',
            created_at: '2026-03-20T08:00:00Z',
            updated_at: '2026-03-20T08:00:00Z',
          },
        ],
      }),
    );

    renderProxyRoutesPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '新增规则' }));
    const dialog = await screen.findByRole('dialog', { name: '新增规则' });

    await user.click(
      within(dialog).getByRole('button', { name: /Select Target Domain/ }),
    );
    await user.click(await screen.findByText('*.example.com'));

    expect(await screen.findByPlaceholderText('e.g. ai')).toBeInTheDocument();
    expect(screen.getByText('*.example.com')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('e.g. ai'), 'ai');

    expect(screen.getByText('ai.example.com')).toBeInTheDocument();
  });

  it('uses exact website directly without showing subdomain input', async () => {
    stubMatchMedia();

    vi.stubGlobal(
      'fetch',
      buildBaseFetchStub({
        managedDomains: [
          {
            id: 2,
            domain: 'a.example.com',
            cert_id: 1,
            enabled: true,
            remark: '',
            created_at: '2026-03-20T08:00:00Z',
            updated_at: '2026-03-20T08:00:00Z',
          },
        ],
      }),
    );

    renderProxyRoutesPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '新增规则' }));
    const dialog = await screen.findByRole('dialog', { name: '新增规则' });

    await user.click(
      within(dialog).getByRole('button', { name: /Select Target Domain/ }),
    );
    await user.click(await screen.findByText('a.example.com'));

    expect(screen.queryByPlaceholderText('e.g. ai')).not.toBeInTheDocument();
    expect((await screen.findAllByText('a.example.com')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Select Certificate')).toBeInTheDocument();
  });

  it('shows origin autocomplete suggestions and empty state', async () => {
    stubMatchMedia();

    vi.stubGlobal(
      'fetch',
      buildBaseFetchStub({
        managedDomains: [
          {
            id: 1,
            domain: '*.example.com',
            cert_id: 1,
            enabled: true,
            remark: '',
            created_at: '2026-03-20T08:00:00Z',
            updated_at: '2026-03-20T08:00:00Z',
          },
        ],
        origins: [
          {
            id: 1,
            name: 'Main Backend',
            address: '192.168.1.45',
            remark: '',
            route_count: 1,
            created_at: '2026-03-20T08:00:00Z',
            updated_at: '2026-03-20T08:00:00Z',
          },
        ],
      }),
    );

    renderProxyRoutesPage();

    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: '新增规则' }));

    const domainTrigger = await screen.findByRole('button', {
      name: /Select Target Domain/,
    });
    await user.click(domainTrigger);
    await user.click(await screen.findByText('*.example.com'));

    const addressInput = screen.getByPlaceholderText('192.168.1.45');
    await user.click(addressInput);
    await user.type(addressInput, '192.');

    expect(await screen.findByText('192.168.1.45')).toBeInTheDocument();
    expect(await screen.findByText('(Main Backend)')).toBeInTheDocument();
    expect(await screen.findByText('Local')).toBeInTheDocument();

    await user.clear(addressInput);
    await user.type(addressInput, '10.10.');

    expect(
      await screen.findByText('未发现匹配资产，请手动输入'),
    ).toBeInTheDocument();
  });
});
