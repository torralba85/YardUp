import type {NextConfig} from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['motion'],
  // Firebase Hosting serves static assets; API routes go to Cloud Functions
  basePath: '',
  assetPrefix: '',
  // Pin the workspace root: functions/ has its own package-lock.json, which
  // makes Next's automatic root inference ambiguous (multiple-lockfile warning).
  turbopack: {
    root: __dirname,
  },
};
export default nextConfig;
