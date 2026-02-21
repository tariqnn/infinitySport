/**
 * Minimal Node/Next type declarations so next.config.ts type-checks
 * when node_modules may be incomplete or IDE uses a different context.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: "development" | "production" | "test";
  }
}

declare const process: { env: NodeJS.ProcessEnv };
declare const __dirname: string;

declare module "path" {
  function resolve(...pathSegments: string[]): string;
  const p: { resolve: typeof resolve };
  export default p;
}

declare module "next" {
  export interface NextConfig {
    webpack?: (config: unknown, context: { dir: string; dev: boolean; isServer: boolean }) => unknown;
    [key: string]: unknown;
  }
}
