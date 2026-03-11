import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';
import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='ATSFlare 管理端'
        description='新版前端已统一承接全部页面入口和迁移期兼容路由，当前可继续推进联调与回归。'
      />
      <DashboardOverview />
    </div>
  );
}
