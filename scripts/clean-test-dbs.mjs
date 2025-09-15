#!/usr/bin/env node
import { rm } from "node:fs/promises";
import path from "node:path";

const dir = path.join(process.cwd(), ".test-dbs");

try {
  await rm(dir, { recursive: true, force: true });
  // eslint-disable-next-line no-console
  console.log("[pretest] cleaned .test-dbs");
} catch (err) {
  // eslint-disable-next-line no-console
  console.warn("[pretest] could not clean .test-dbs:", err);
}

