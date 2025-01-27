/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['bsvpclhxtaazxpkaporc.supabase.co'], // Add your Supabase hostname here
  },
  supabase: {
    client: {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    },
  },
};

module.exports = nextConfig;