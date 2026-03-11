import { PublicRoutePlaceholder } from '@/features/auth/components/public-route-placeholder';

export default function GithubOAuthPage() {
  return (
    <PublicRoutePlaceholder
      title='GitHub OAuth 回调占位'
      description='阶段 2 将在此接入授权回调处理、状态提示与跳转逻辑。'
    />
  );
}
