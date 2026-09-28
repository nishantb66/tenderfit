import { redirect } from 'next/navigation';
import { session } from '@/server/auth';
import { isAdminEmail } from '@/config/admin';
import { RoleChoice } from './role-choice';
export default async function ChooseRole() {
  const user = await session();
  if (!user) redirect('/');
  if (!isAdminEmail(user.email)) redirect('/dashboard');
  return <RoleChoice name={user.name} />;
}
