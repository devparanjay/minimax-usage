/* eslint-env node */
import { build, context } from "esbuild";
import { cp, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isProd =
  process.env.NODE_ENV === "production" ||
  process.argv.includes("--prod");

const devKey = process.env.MINIMAX_USAGE_DEV_KEY;
if (isProd && devKey) {
  throw new Error(
    "MINIMAX_USAGE_DEV_KEY is set in a production build. " +
      "Unset the env var or build with NODE_ENV != 'production'.",
  );
}

const define = {
  __DEV_API_KEY__: JSON.stringify(devKey ?? ""),
  __DEV_API_KEY_ENABLED__: JSON.stringify(Boolean(devKey)),
  "process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development")
};

const hostEntry = {
  entryPoints: ["src/extension.ts"],
  outfile: "dist/extension.js",
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  sourcemap: true,
  external: ["vscode"],
  logLevel: "info",
  define
};

const webviewEntry = {
  entryPoints: ["src/ui/webview/template/sidebar.ts"],
  outfile: "dist/webview/sidebar.js",
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: "es2022",
  sourcemap: true,
  logLevel: "info",
  define
};

async function copyStaticAssets() {
  await mkdir("dist/webview", { recursive: true });
  await cp("src/ui/webview/template/sidebar.html", "dist/webview/sidebar.html");
  await cp("src/ui/webview/template/sidebar.css", "dist/webview/sidebar.css");
}

function assertWebviewAssets() {
  const expected = [
    "dist/webview/sidebar.html",
    "dist/webview/sidebar.css",
    "dist/webview/sidebar.js"
  ];
  for (const p of expected) {
    if (!existsSync(p)) {
      throw new Error(
        `build artefact missing: ${p}. ` +
          "copyStaticAssets() must copy or produce this file."
      );
    }
  }
}

const isWatch = process.argv.includes("--watch");

if (isWatch) {
  const ctxHost = await context(hostEntry);
  const ctxWebview = await context(webviewEntry);
  await Promise.all([ctxHost.watch(), ctxWebview.watch()]);
  await copyStaticAssets();
  assertWebviewAssets();
  console.warn("esbuild: watching for changes...");
} else {
  await build(hostEntry);
  await build(webviewEntry);
  await copyStaticAssets();
  assertWebviewAssets();
}

if (isProd) {
  console.warn("esbuild: production build complete.");
  if (!devKey) {
    console.warn("esbuild: no MINIMAX_USAGE_DEV_KEY set; dev-key shim disabled.");
  }
}

const pkgPath = resolve(__dirname, "package.json");
const pkgRaw = await readFile(pkgPath, "utf8");
const pkg = JSON.parse(pkgRaw);
console.warn(`esbuild: built package ${pkg.name}@${pkg.version}`);
