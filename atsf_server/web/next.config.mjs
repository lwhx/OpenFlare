/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  pageExtensions: ['ts', 'tsx'],
  images: {
    unoptimized: true,
  },
  eslint: {
    dirs: ['app', 'components', 'features', 'hooks', 'lib', 'store', 'tests', 'types'],
  },
};

export default nextConfig;
