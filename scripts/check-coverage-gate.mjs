import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const summaryPath = path.join(root, "coverage", "coverage-summary.json");
// Keep this inventory aligned with vitest.config.ts and the coverage scope in
// openspec/specs/belongings/spec.md. App entrypoints are intentionally outside
// these roots; type-only files are excluded from runtime coverage.
const sourceRoots = ["src/components", "src/hooks", "src/lib"];
const excludedSourceFiles = new Set(["src/lib/types.ts"]);
const globalFloors = {
  lines: 100,
  statements: 100,
  functions: 100,
  branches: 100,
};
const tierFloors = {
  "src/components": { statements: 100, branches: 100 },
  "src/hooks": { statements: 100, branches: 100 },
  "src/lib": { statements: 100, branches: 100 },
};

function fail(message) {
  console.error(`Raw Vitest coverage gate failed: ${message}`);
  process.exitCode = 1;
}

async function listSourceFiles(directory) {
  const entries = await readdir(path.join(root, directory), { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(relative)));
    } else if (
      entry.isFile() &&
      /\.tsx?$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts") &&
      !excludedSourceFiles.has(relative)
    ) {
      files.push(relative);
    }
  }
  return files;
}

function normalizeReportPath(file) {
  if (typeof file !== "string" || file.length === 0) {
    throw new Error("report contains an empty or non-string file path");
  }
  const absolute = path.isAbsolute(file) ? path.normalize(file) : path.resolve(root, file);
  const relative = path.relative(root, absolute);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`report path is outside the repository: ${file}`);
  }
  return relative.split(path.sep).join("/");
}

function validateMetric(metrics, file, metricName) {
  const metric = metrics?.[metricName];
  if (
    !metric ||
    !Number.isInteger(metric.covered) ||
    !Number.isInteger(metric.total) ||
    metric.covered < 0 ||
    metric.total < 0 ||
    metric.covered > metric.total
  ) {
    throw new Error(`malformed or empty ${metricName} metrics for ${file}`);
  }
  return metric;
}

function assertFloor(label, metric, floor) {
  if (metric.covered * 100 < floor * metric.total) {
    const actual = ((metric.covered / metric.total) * 100).toFixed(2);
    fail(`raw Vitest ${label} is ${actual}% (requires ${floor}%; ${metric.covered}/${metric.total}). E2E behavior-contract checks are reported separately and do not change this denominator.`);
  }
}

let summary;
try {
  summary = JSON.parse(await readFile(summaryPath, "utf8"));
} catch (error) {
  fail(`cannot read or parse ${path.relative(root, summaryPath)}: ${error.message}`);
  process.exit(1);
}

try {
  if (!summary || typeof summary !== "object" || Array.isArray(summary)) {
    throw new Error("coverage summary must be a JSON object");
  }
  const reportFiles = Object.entries(summary).filter(([key]) => key !== "total");
  if (reportFiles.length === 0 || !summary.total) {
    throw new Error("coverage summary is empty or has no total metrics");
  }

  const expected = (await Promise.all(sourceRoots.map(listSourceFiles))).flat().sort();
  const reported = new Map();
  for (const [rawPath, metrics] of reportFiles) {
    const normalized = normalizeReportPath(rawPath);
    if (reported.has(normalized)) throw new Error(`duplicate normalized report path: ${normalized}`);
    reported.set(normalized, metrics);
  }
  const expectedSet = new Set(expected);
  const missing = expected.filter((file) => !reported.has(file));
  const extra = [...reported.keys()].filter((file) => !expectedSet.has(file));
  if (missing.length || extra.length) {
    const details = [
      missing.length ? `missing: ${missing.join(", ")}` : "",
      extra.length ? `unexpected: ${extra.join(", ")}` : "",
    ].filter(Boolean);
    throw new Error(`report file set does not match source inventory (${details.join("; ")})`);
  }

  for (const file of expected) {
    for (const metricName of Object.keys(globalFloors)) {
      const metric = validateMetric(reported.get(file), file, metricName);
      if ((metricName === "lines" || metricName === "statements") && metric.total === 0) {
        throw new Error(`${metricName} data is empty for ${file}`);
      }
    }
  }

  for (const [metricName, floor] of Object.entries(globalFloors)) {
    const metric = validateMetric(summary.total, "total", metricName);
    if (metric.total === 0) throw new Error(`global ${metricName} data is empty`);
    assertFloor(`global ${metricName}`, metric, floor);
  }

  for (const [tier, floors] of Object.entries(tierFloors)) {
    const files = expected.filter((file) => file.startsWith(`${tier}/`));
    if (files.length === 0) throw new Error(`coverage tier is empty: ${tier}`);
    for (const [metricName, floor] of Object.entries(floors)) {
      let covered = 0;
      let total = 0;
      for (const file of files) {
        const metric = validateMetric(reported.get(file), file, metricName);
        covered += metric.covered;
        total += metric.total;
      }
      if (total === 0) throw new Error(`coverage tier has no ${metricName} data: ${tier}`);
      assertFloor(`${tier} ${metricName}`, { covered, total }, floor);
    }
  }
} catch (error) {
  fail(error.message);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("Raw Vitest coverage gate passed: source inventory and configured floors are satisfied. E2E behavior-contract checks are separate.");
