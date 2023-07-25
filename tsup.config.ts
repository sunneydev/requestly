import { defineConfig, type Options } from "tsup";

export default defineConfig((flags) => {
  const buildOptions: Options = {
    minify: true,
    clean: true,
    format: ["cjs", "esm"],
    dts: true,
  };

  return {
    entry: ["src/index.ts", "src/types.ts"],
    outDir: "lib",
    ...buildOptions,
  };
});
