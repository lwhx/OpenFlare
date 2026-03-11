import { LegacyRouteRedirect } from '@/features/shared/components/legacy-route-redirect';

export default function LegacyUserAddPage() {
  return <LegacyRouteRedirect href='/users?mode=create' />;
}
