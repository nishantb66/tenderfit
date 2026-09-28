import { NextResponse } from 'next/server';
import {
  requireSession,
  revokeSession,
  issueSession,
  audit,
} from '@/server/auth';
import { isAdminEmail } from '@/config/admin';
import { sameOrigin, error } from '@/server/http';
export async function POST(req: Request) {
  if (!sameOrigin(req)) return error('Invalid origin', 403);
  try {
    const current = await requireSession();
    const { role } = await req.json();
    if (role !== 'general' && role !== 'admin') return error('Invalid role');
    if (role === 'admin' && !isAdminEmail(current.email))
      return error('Admin access required', 403);
    await revokeSession();
    await issueSession(
      { sub: current.sub, email: current.email, name: current.name },
      role,
    );
    await audit(current.sub, 'role_switch', { role });
    return NextResponse.json({ role });
  } catch (e) {
    return error(e instanceof Error ? e.message : 'Role switch failed', 401);
  }
}
