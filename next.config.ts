import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';
const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  skipTrailingSlashRedirect: true,
};
export default withWorkflow(nextConfig);
