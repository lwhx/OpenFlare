import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';
import { PageHeader } from '@/components/layout/page-header';

export default function DashboardPage() {
  return (
    <div className='space-y-6'>
      <PageHeader
        title='ATSFlare 管理端工程初始化'
        description='新版前端已切换到 Next.js 工程骨架，当前页面用于展示阶段 1 交付结果与模块入口。'
      />
      <DashboardOverview />
    </div>
  );
}
