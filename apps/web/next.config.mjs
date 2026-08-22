/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // The calculation core is consumed straight from TypeScript source so that
  // editing it hot-reloads the app. Next has to transpile it, and webpack has
  // to be told that the ESM-correct `./foo.js` specifiers inside that source
  // resolve to `./foo.ts` on disk.
  transpilePackages: ['@jade/astro', '@jade/ui'],

  webpack(config) {
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
    };
    return config;
  },

  experimental: {
    externalDir: true,
    turbo: {
      resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
    },
  },
};

export default nextConfig;
