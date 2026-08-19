// Minimal zero-dependency static file server for local development.
// A production deploy should use a real static host (Vercel/Netlify/Cloudflare
// Pages/nginx) instead — this is just enough to preview the site locally.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  let filePath = normalize(join(ROOT, urlPath === "/" ? "/index.html" : urlPath));

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, "index.html");
    const body = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`[tanky-website] http://localhost:${PORT}`);
});
