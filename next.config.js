import createNextIntlPlugin from "next-intl/plugin";

const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  images: {
    // Optimalizaci vypínáme: obrázky komprimujeme sami (klient → WebP, server →
    // resize na 2500px @ q82), takže vestavěná optimalizace nic nepřidá. Navíc
    // přes ngrok tunel interní fetch optimizeru dostával ngrok warning stránku
    // místo obrázku → "isn't a valid image / received null" a fotky se nezobrazily.
    unoptimized: true,
    remotePatterns: [{ hostname: "placehold.co" }],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
