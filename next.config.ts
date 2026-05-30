import type {NextConfig} from 'next';
const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['motion'],
  // Firebase Hosting serves static assets; API routes go to Cloud Functions
  basePath: '',
  assetPrefix: '',
};
export default nextConfig;
