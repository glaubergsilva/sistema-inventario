import type { NextConfig } from "next";

const config: NextConfig = {
  // inclui o schema.sql no pacote da função (Vercel)
  outputFileTracingIncludes: { "/**": ["./db/schema.sql"] },
};

export default config;
