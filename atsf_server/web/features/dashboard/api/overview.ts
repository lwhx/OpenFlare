import { apiRequest } from '@/lib/api/client';

import type { DashboardOverview } from '@/features/dashboard/types';

export function getDashboardOverview() {
  return apiRequest<DashboardOverview>('/dashboard/overview');
}
