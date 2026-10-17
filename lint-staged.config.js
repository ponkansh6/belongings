import path from "node:path";
import { spawnSync } from "node:child_process";

const run = (args) => {
  const result = spawnSync("pnpm", ["exec", ...args], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`pnpm exec ${args[0]} failed`);
};

export default {
  "**/*": {
    title: "format, secretlint, and test staged files",
    task: (stagedFiles) => {
      const sourceFiles = stagedFiles.filter((file) => /\.tsx?$/.test(file));
      if (sourceFiles.length > 0) run(["oxfmt", "--write", ...sourceFiles]);
      run(["secretlint", "--no-glob", ...stagedFiles]);
      const hasSrcSource = sourceFiles.some((file) =>
        path.relative(process.cwd(), file).split(path.sep).join("/").startsWith("src/")
      );
      if (hasSrcSource) {
        run(["vitest", "run"]);
      }
    },
  },
};
