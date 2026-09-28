import { redirect } from 'next/navigation';
import { session } from '@/server/auth';
import { AppShell } from '@/components/AppShell';
import { isAdminEmail } from '@/config/admin';
import { ReportView } from './report-view';
export default async function Report({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await session();
  if (!user) redirect('/');
  const { id } = await params;
  return (
    <AppShell
      role={user.role}
      name={user.name}
      adminEntitled={isAdminEmail(user.email)}
    >
      <ReportView id={id} isAdmin={user.role === 'admin'} />
    </AppShell>
  );
}
