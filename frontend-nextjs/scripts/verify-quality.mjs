import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const commands = [
  ["TypeScript", ["node_modules/typescript/bin/tsc", "--noEmit"]],
  ["ESLint", ["node_modules/eslint/bin/eslint.js", "."]],
];

for (const [name, args] of commands) {
  const result = spawnSync(process.execPath, args.map((arg, index) => index === 0 ? resolve(arg) : arg), {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    console.error(`${name} check failed`);
    process.exit(result.status ?? 1);
  }
}

console.log("FRONTEND_STATIC_CHECKS_PASS");
