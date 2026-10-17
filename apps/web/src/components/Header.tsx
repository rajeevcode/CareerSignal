import { HeaderClient } from '@/components/HeaderClient';
import { getCurrentUser } from '@/lib/auth/session';

export async function Header() {
  const user = await getCurrentUser();
  return <HeaderClient user={user ? { full_name: user.full_name, role: user.role } : null} />;
}
