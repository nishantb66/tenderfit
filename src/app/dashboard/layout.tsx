import { redirect } from 'next/navigation';
import { session } from '@/server/auth';
import { AppShell } from '@/components/AppShell';
import { isAdminEmail } from '@/config/admin';
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await session();
  if (!user) redirect('/');
  if (user.role !== 'general') redirect('/admin');
  return (
    <AppShell
      role="general"
      name={user.name}
      adminEntitled={isAdminEmail(user.email)}
    >
      {children}
    </AppShell>
  );
}
