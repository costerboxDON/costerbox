/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '**',
      },
      {
        // New Firebase Storage domain (firebasestorage.app) used by newer Firebase projects
        protocol: 'https',
        hostname: '*.firebasestorage.app',
        pathname: '**',
      },
      {
        // Direct Google Cloud Storage (some Firebase SDKs use this)
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '**',
      },
      {
        // Flaticon CDN used for trust icons on product page
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;