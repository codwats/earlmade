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

// Image fixtures, written and removed the same way: a public post with a sibling
// image, a private one whose image must stay out, and public links with a
// thumbnail, a broken thumbnail and none. Their "remote" thumbnails come from a
// local server, so no test needs the network.
export const FALLBACK_LABEL = "A long fallback label that has to tile cleanly";
const PNG = readFileSync(join(ROOT, "src/apple-touch-icon.png"));
const imageFixtures = (host) => ({
  "./src/content/__test-image-post.md": "---\ntitle: Test image post\nstatus: public\n---\n![A test image](./__test-image.png)\n",
  "./src/content/__test-image.png": PNG,
  "./src/content/__test-private.md": "---\nstatus: private\n---\n![A private image](./__test-private.png)\n",
  "./src/content/__test-private.png": PNG,
  "./src/content/__test-thumb-link.md": `---\nurl: https://example.com/thumb\ntitle: Test thumbnail link\nimage: ${host}/thumb.png\nstatus: public\n---\n`,
  "./src/content/__test-broken-thumb-link.md": `---\nurl: https://example.com/broken\ntitle: Test broken thumbnail\nimage: ${host}/missing.png\nstatus: public\n---\n`,
  "./src/content/__test-fallback-link.md": `---\nurl: https://example.com/fallback\ntitle: ${FALLBACK_LABEL}\nstatus: public\n---\n`,
  // Two links whose fileSlug is the same: Eleventy drops the date from it.
  "./src/content/2020-01-01-__test-same-slug.md": "---\nurl: https://example.com/same-1\ntitle: Test same slug one\nstatus: public\n---\n",
  "./src/content/2020-01-02-__test-same-slug.md": "---\nurl: https://example.com/same-2\ntitle: Test same slug two\nstatus: public\n---\n",
});
export const IMAGE_HOST = "127.0.0.1";

// One Eleventy build into a temp directory, with `files` written into the repo
// for its duration only. Rejects when the build fails (its log is on the error).
async function buildWithFixtures(files) {
  const outDir = mkdtempSync(join(tmpdir(), "earlmade-test-"));
  // On exit, not after(): called from inside a test, after() would remove it when that test ends.
  process.once("exit", () => rmSync(outDir, { recursive: true, force: true }));
  const paths = Object.keys(files).map((path) => join(ROOT, path));
  const clean = () => paths.forEach((path) => rmSync(path, { force: true }));
  process.once("exit", clean);
  for (const [path, content] of Object.entries(files)) writeFileSync(join(ROOT, path), content);
  const { stdout, stderr } = await promisify(execFile)(
    process.execPath,
    [join(ROOT, "node_modules/@11ty/eleventy/cmd.cjs"), `--output=${outDir}`],
    { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 },
  ).finally(clean);
  return {
    outDir,
    log: stdout + stderr,
    read: (path) => readFileSync(join(outDir, path), "utf8"),
  };
}

let built;
export function build() {
  built ??= (async () => {
    const host = createServer((req, res) =>
      req.url === "/thumb.png" ? res.writeHead(200, { "content-type": "image/png" }).end(PNG) : res.writeHead(404).end(),
    );
    await new Promise((resolve) => host.listen(0, IMAGE_HOST, resolve));
    try {
      return await buildWithFixtures({
        [FIXTURE.path]: `---\nstatus: inbox\nshelf: ${FIXTURE.shelf}\n---\nTest fixture. Safe to delete.\n`,
        ...imageFixtures(`http://${IMAGE_HOST}:${host.address().port}`),
      });
    } finally {
      host.close();
    }
  })();
  return built;
}

// A separate build with other fixtures, for builds meant to fail. It waits for
// the shared build, so the two sets of fixtures never meet.
export async function buildWith(files) {
  await build().catch(() => {});
  return buildWithFixtures(files);
}

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".avif": "image/avif",
  ".webp": "image/webp",
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
