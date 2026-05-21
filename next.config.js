import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  images: {
    remotePatterns: [{ hostname: "placehold.co" }],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
