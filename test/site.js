// The one test seam: the built site.
// `build()` runs Eleventy once per test run into a temp directory and captures
// the build log. `browser()` serves that output over a local static server and
// launches system Chromium once (playwright-core, no bundled browsers).
// Tests run with --test-isolation=none, so every test file shares these.
import { after } from "node:test";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { promisify } from "node:util";

const ROOT = new URL("..", import.meta.url).pathname;
export const CHROMIUM_PATH = process.env.CHROMIUM_PATH || "/usr/bin/chromium";

// A temporary item on a shelf that isn't in the shelf list, present only for
// the one build so its warning shows in the log. It stays in the inbox, so it
// is never built or listed and can't change any other test's output.
// Removed as soon as the build ends, pass or fail. (Not gitignored: Eleventy
// skips gitignored files, so the build would never see it.)
export const FIXTURE = {
  path: "./src/content/__test-unknown-shelf.md",
  shelf: "Not a real shelf",
};

let built;
export function build() {
  built ??= (async () => {
    const outDir = mkdtempSync(join(tmpdir(), "earlmade-test-"));
    after(() => rmSync(outDir, { recursive: true, force: true }));
    const fixture = join(ROOT, FIXTURE.path);
    process.once("exit", () => rmSync(fixture, { force: true }));
    writeFileSync(fixture, `---\nstatus: inbox\nshelf: ${FIXTURE.shelf}\n---\nTest fixture. Safe to delete.\n`);
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), `--output=${outDir}`],
      { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 },
    ).finally(() => rmSync(fixture, { force: true }));
    return {
      outDir,
      log: stdout + stderr,
      read: (path) => readFileSync(join(outDir, path), "utf8"),
    };
  })();
  return built;
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};

function serve(dir) {
  const server = createServer((req, res) => {
    let path = join(dir, normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)));
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
    if (!path.startsWith(dir) || !existsSync(path)) {
      res.writeHead(404).end("Not found");
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream" });
    res.end(readFileSync(path));
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

let launched;
// Resolves to { browser, baseURL }, or null when no Chromium is installed.
export function browser() {
  launched ??= (async () => {
    if (!existsSync(CHROMIUM_PATH)) return null;
    const { outDir } = await build();
    const server = await serve(outDir);
    const { chromium } = await import("playwright-core");
    const instance = await chromium.launch({ executablePath: CHROMIUM_PATH });
    after(async () => {
      await instance.close();
      server.close();
    });
    return { browser: instance, baseURL: `http://127.0.0.1:${server.address().port}` };
  })();
  return launched;
}

export const NO_BROWSER = `no Chromium at ${CHROMIUM_PATH}; set CHROMIUM_PATH to run browser tests`;
