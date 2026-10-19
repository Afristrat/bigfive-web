const createNextIntlPlugin = require('next-intl/plugin');
const { withContentlayer } = require('next-contentlayer2');

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  images: { unoptimized: true }
};

module.exports = withContentlayer(withNextIntl(nextConfig));
