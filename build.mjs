// @ts-check
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

const watch = process.argv.includes("--watch");
const outdir = "dist";

rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

// Copy static assets
for (const file of ["manifest.json"]) {
  cpSync(file, join(outdir, file));
}
for (const dir of ["icons", "src/options", "src/popup"]) {
  cpSync(dir, join(outdir, dir.replace("src/", "")), {
    recursive: true,
    filter: (src) => !src.endsWith(".ts"),
  });
}

/** @type {esbuild.BuildOptions} */
const baseOptions = {
  bundle: true,
  sourcemap: true,
  target: "es2020",
  platform: "browser",
};

const entryPoints = [
  { in: "src/background/service-worker.ts", out: "background/service-worker" },
  { in: "src/options/options.ts", out: "options/options" },
  { in: "src/popup/popup.ts", out: "popup/popup" },
];

if (watch) {
  const ctx = await esbuild.context({ ...baseOptions, entryPoints, outdir });
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build({ ...baseOptions, entryPoints, outdir });
  console.log("Build complete.");
}
