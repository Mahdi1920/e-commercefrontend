import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname, ".."),
    resolveAlias: {
      "@mui/material/styles": "./node_modules/@mui/material/esm/styles/index.js",
      "@mui/material": "./node_modules/@mui/material/esm/index.js",
      "@mui/icons-material": "./node_modules/@mui/icons-material",
      zod: "./node_modules/zod/index.js",
      axios: "./node_modules/axios/index.js",
    },
  },
};

export default nextConfig;
