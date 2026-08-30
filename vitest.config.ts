import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // mirror tsconfig's "@/*" alias
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // no pure logic exists yet; the rotation engine (#6) brings the first
    // real tests — remove this once they land
    passWithNoTests: true,
  },
});
