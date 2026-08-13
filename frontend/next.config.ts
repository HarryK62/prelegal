import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  // Static export normally emits nested routes as both "history.html" and a
  // "history/" directory holding only RSC payload data (no index.html) - Starlette's
  // StaticFiles resolves "/history" to that directory first and 404s since there's no
  // index.html inside it. trailingSlash makes Next.js emit "history/index.html"
  // instead, matching what the static file server expects.
  trailingSlash: true,
};

export default nextConfig;
