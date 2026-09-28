import { redirect } from 'next/navigation';
import { session } from '@/server/auth';
import { AppShell } from '@/components/AppShell';
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await session();
  if (!user) redirect('/');
  if (user.role !== 'admin') redirect('/dashboard');
  return (
    <AppShell role="admin" name={user.name} adminEntitled>
      {children}
    </AppShell>
  );
}
