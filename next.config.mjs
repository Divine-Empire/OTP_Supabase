/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  env: {
    INSTALLATION_SCRIPT_URL: process.env.INSTALLATION_SCRIPT_URL,
    INSTALLATION_SHEET_ID: process.env.INSTALLATION_SHEET_ID,
    REORDER_SCRIPT_URL: process.env.REORDER_SCRIPT_URL,
    IMS_SHEET_ID: process.env.IMS_SHEET_ID,
    INDENT_SCRIPT_URL: process.env.INDENT_SCRIPT_URL,
    IMS_SCRIPT_URL: process.env.IMS_SCRIPT_URL,
  },
}

export default nextConfig
