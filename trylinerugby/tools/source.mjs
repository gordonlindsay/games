// Read the buildless page as one source for existing engine and layout checks.
// GAME may point to a legacy inline snapshot or a page with local CSS/JS files.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export function readGameSource() {
  const pagePath = process.env.GAME ? path.resolve(process.env.GAME) : fileURLToPath(new URL('../index.html', import.meta.url));
  const directory = path.dirname(pagePath);
  let html = fs.readFileSync(pagePath, 'utf8');
  html = html.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/g, (tag, href) =>
    /^(?:[a-z]+:|\/\/)/i.test(href) ? tag : '<style>' + fs.readFileSync(path.resolve(directory, href), 'utf8') + '</style>');
  html = html.replace(/<script\s+src=["']([^"']+)["']\s*><\/script>/g, (_, src) =>
    '<script>' + fs.readFileSync(path.resolve(directory, src), 'utf8') + '</script>');
  return html;
}
