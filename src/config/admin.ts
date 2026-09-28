export const ADMIN_EMAILS = new Set(['baruahnishant2003@gmail.com']);
export function isAdminEmail(email: string) {
  return ADMIN_EMAILS.has(email.trim().toLowerCase());
}
