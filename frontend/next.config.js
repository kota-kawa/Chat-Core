const backendUrl = process.env.BACKEND_URL || "http://localhost:5004";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/", destination: "/legacy/home.html" },
      { source: "/login", destination: "/legacy/auth.html" },
      { source: "/register", destination: "/legacy/auth.html" },
      { source: "/settings", destination: "/legacy/user_settings.html" },
      { source: "/prompt_share", destination: "/legacy/prompt_share.html" },
      { source: "/prompt_share/manage_prompts", destination: "/legacy/prompt_manage.html" },
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/prompt_share/api/:path*", destination: `${backendUrl}/prompt_share/api/:path*` },
      { source: "/prompt_manage/api/:path*", destination: `${backendUrl}/prompt_manage/api/:path*` },
      { source: "/search/:path*", destination: `${backendUrl}/search/:path*` },
      { source: "/memo/api/:path*", destination: `${backendUrl}/memo/api/:path*` },
      { source: "/admin/api/:path*", destination: `${backendUrl}/admin/api/:path*` },
      { source: "/admin/logout", destination: `${backendUrl}/admin/logout` },
      { source: "/google-login", destination: `${backendUrl}/google-login` },
      { source: "/google-callback", destination: `${backendUrl}/google-callback` },
      { source: "/logout", destination: `${backendUrl}/logout` }
    ];
  }
};

module.exports = nextConfig;
