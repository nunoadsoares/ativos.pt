// packages/webapp/scripts/run-exports.mjs
import { readdir } from "node:fs/promises";
import { join, extname } from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const DIR = fileURLToPath(new URL("./", import.meta.url));
const list = (await readdir(DIR)).filter(f =>
  f.startsWith("export-") && [".js", ".cjs"].includes(extname(f))
);

if (list.length === 0) {
  console.log("Sem scripts export-*.js/.cjs — nada para exportar.");
  process.exit(0);
}

for (const f of list) {
  console.log("->", f);
  await new Promise((res, rej) => {
    const p = spawn(process.execPath, [join(DIR, f)], { stdio: "inherit", env: process.env });
    p.on("exit", code => (code === 0 ? res() : rej(new Error(`${f} saiu com código ${code}`))));
  });
}
console.log("Export concluído.");
