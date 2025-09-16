#!/usr/bin/env node
// Generate a reverse index (backlinks) for Markdown files under docs/bank-memory
// Produces: docs/bank-memory/_reverse-index.md

import { promises as fs } from "fs";
import path from "path";

const DOCS_DIR = path.resolve(process.cwd(), "docs", "bank-memory");
const OUTPUT_FILE = path.join(DOCS_DIR, "_reverse-index.md");

/** Recursively collect .md files under a directory */
async function collectMarkdownFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return collectMarkdownFiles(fullPath);
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) return [fullPath];
      return [];
    }),
  );
  return files.flat();
}

/** Extract outbound links to .md files from Markdown content */
function extractMarkdownLinks(markdown, fromFileDir) {
  const links = [];
  const linkRegex = /\[[^\]]*\]\(([^)]+)\)/g; // [text](href)
  let match;
  while ((match = linkRegex.exec(markdown)) !== null) {
    let href = match[1].trim();
    // Skip external, anchors and mailto/tel
    if (/^(https?:)?\/\//i.test(href)) continue;
    if (/^(mailto:|tel:)/i.test(href)) continue;
    if (href.startsWith("#")) continue;
    // Remove anchors and queries
    href = href.split("#")[0].split("?")[0];
    if (!href) continue;
    // Only consider markdown files
    if (!href.toLowerCase().endsWith(".md")) continue;
    // Resolve relative to current file dir
    const resolved = path.normalize(path.resolve(fromFileDir, href));
    links.push(resolved);
  }
  return links;
}

function toRelDocsPath(absPath) {
  // Relative to DOCS_DIR for nicer display
  return path.relative(DOCS_DIR, absPath) || path.basename(absPath);
}

async function main() {
  // Ensure docs dir exists
  try {
    await fs.access(DOCS_DIR);
  } catch {
    console.error(`Docs directory not found: ${DOCS_DIR}`);
    process.exit(1);
  }

  const files = (await collectMarkdownFiles(DOCS_DIR)).sort();
  const outboundMap = new Map(); // file -> Set(toFiles)
  const inboundMap = new Map(); // file -> Set(fromFiles)

  for (const file of files) {
    outboundMap.set(file, new Set());
    inboundMap.set(file, new Set());
  }

  // Build graph
  for (const file of files) {
    const content = await fs.readFile(file, "utf8");
    const outLinks = extractMarkdownLinks(content, path.dirname(file));
    for (const to of outLinks) {
      if (!outboundMap.has(to)) continue; // only consider links within docs/bank-memory
      outboundMap.get(file).add(to);
      inboundMap.get(to).add(file);
    }
  }

  // Render reverse index
  const lines = [];
  lines.push("# Índice Reverso (Backlinks)\n");
  lines.push("Geração automática a partir de links Markdown entre arquivos em `docs/bank-memory`.\n");
  lines.push("- Arquivo: lista de páginas que fazem referência a ele (backlinks).\n");
  lines.push("");

  for (const file of files) {
    const rel = toRelDocsPath(file);
    const inbound = Array.from(inboundMap.get(file)).sort();
    lines.push(`## ${rel}`);
    if (inbound.length === 0) {
      lines.push("- (sem referências)");
    } else {
      for (const from of inbound) {
        const relFrom = toRelDocsPath(from);
        // Use relative link within docs dir
        const mdLink = relFrom.replace(/\\s/g, "%20");
        lines.push(`- [${relFrom}](./${mdLink})`);
      }
    }
    lines.push("");
  }

  await fs.writeFile(OUTPUT_FILE, lines.join("\n"), "utf8");
  console.log(`Backlinks index written to: ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

