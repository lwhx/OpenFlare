import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';

describe('DashboardOverview', () => {
  it('renders stage one heading and readiness items', () => {
    render(<DashboardOverview />);

    expect(screen.getByText('阶段 1 已启动')).toBeInTheDocument();
    expect(screen.getByText('工程底座')).toBeInTheDocument();
    expect(screen.getByText('质量工具')).toBeInTheDocument();
  });
});
