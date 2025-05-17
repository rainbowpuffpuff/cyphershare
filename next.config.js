/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/api/codex/:path*',
        destination: 'https://api.demo.codex.storage/fileshareapp/api/codex/:path*',
        basePath: false
      }
    ];
  },
  async headers() {
    return [
      {
        source: '/api/codex/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type, Content-Disposition, Accept' },
          { key: 'Access-Control-Allow-Credentials', value: 'true' }
        ]
      }
    ];
  }
};

module.exports = nextConfig; 