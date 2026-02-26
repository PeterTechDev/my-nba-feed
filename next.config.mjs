/** @type {import('next').NextConfig} */
import { fileURLToPath } from "url";

const nextConfig = {
  // Avoid Next.js picking an unrelated workspace root when multiple lockfiles exist.
  turbopack: {
    root: fileURLToPath(new URL("./", import.meta.url)),
  },
};

export default nextConfig;
