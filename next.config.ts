import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack(config) {
    const fileLoaderRule = config.module.rules.find(
      (rule: { test?: RegExp }) =>
        rule && rule.test instanceof RegExp && rule.test.test(".svg"),
    );

    if (!fileLoaderRule) return config;

    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/,
      },
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: {
          not: [
            ...(Array.isArray(fileLoaderRule.resourceQuery)
              ? fileLoaderRule.resourceQuery
              : []),
            /url/,
          ],
        },
        use: [
          {
            loader: "@svgr/webpack",
            options: { svgo: true, titleProp: true, ref: true },
          },
        ],
      },
    );

    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
};

export default nextConfig;
