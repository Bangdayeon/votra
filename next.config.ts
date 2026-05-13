import type { NextConfig } from "next";
import type { RuleSetRule } from "webpack";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack(config) {
    const fileLoaderRule = config.module.rules.find(
      (rule: RuleSetRule | undefined): rule is RuleSetRule =>
        !!rule &&
        typeof rule === "object" &&
        rule.test instanceof RegExp &&
        rule.test.test(".svg"),
    );

    if (!fileLoaderRule) return config;

    config.module.rules.push(
      // *.svg?url → emit asset URL (Next.js default behavior)
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/,
      },
      // *.svg → React component via SVGR
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
            options: {
              svgo: true,
              titleProp: true,
              ref: true,
            },
          },
        ],
      },
    );

    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
};

export default nextConfig;
