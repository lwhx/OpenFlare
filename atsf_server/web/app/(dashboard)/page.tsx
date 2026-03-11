import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';
import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='ATSFlare 管理端'
        description='集中展示系统核心数据概览，快速导航至各功能模块进行管理和配置。'
      />
      <DashboardOverview />
    </div>
  );
}
