import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_LISTS = [
  "security/zap/frontend-urls.txt",
  "security/zap/admin-urls.txt",
  "security/zap/workroom-urls.txt",
  "security/zap/backend-urls.txt",
];

const listPaths = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_LISTS;

const normalizeLine = (line) => line.trim();

const loadUrls = async (filePath) => {
  const raw = await readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/g)
    .map(normalizeLine)
    .filter(Boolean)
    .map((url) => ({ filePath, url }));
};

const fetchWithTimeout = async (url, timeoutMs = 8000) => {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "cyphire-seed-check/1.0" },
    });
    return {
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      error: "",
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      error: error?.message || "Request failed",
    };
  }
};

const run = async () => {
  const entries = [];
  for (const listPath of listPaths) {
    const abs = path.resolve(listPath);
    const urls = await loadUrls(abs);
    entries.push(...urls);
  }

  if (!entries.length) {
    console.log("No URLs found in provided seed files.");
    process.exit(1);
  }

  let pass = 0;
  let fail = 0;

  for (const { filePath, url } of entries) {
    const result = await fetchWithTimeout(url);
    const success = result.status > 0 && result.status < 500;
    if (success) pass += 1;
    else fail += 1;

    const statusText = result.status ? String(result.status) : "ERR";
    const marker = success ? "OK" : "FAIL";
    const extra = result.error ? ` | ${result.error}` : "";
    console.log(
      `${marker}\t${statusText}\t${result.durationMs}ms\t${url}\t(${path.basename(filePath)})${extra}`
    );
  }

  console.log("");
  console.log(`Summary: ${pass} pass, ${fail} fail, ${entries.length} total`);
  process.exit(fail > 0 ? 2 : 0);
};

run().catch((error) => {
  console.error("Seed coverage check failed:", error?.message || error);
  process.exit(1);
});
