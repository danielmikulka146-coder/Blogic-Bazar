import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
