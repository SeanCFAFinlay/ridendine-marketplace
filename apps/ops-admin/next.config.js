/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@ridendine/db',
    '@ridendine/ui',
    '@ridendine/auth',
    '@ridendine/types',
    '@ridendine/utils',
    '@ridendine/validation',
  ],
};

module.exports = nextConfig;
