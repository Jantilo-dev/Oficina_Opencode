import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const BINARY_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".woff", ".woff2", ".ttf"]);
const MOJIBAKE = new RegExp("[\\u00C3][\\u0080-\\u00FF\\u20AC\\u0152\\u0160\\u0178\\u017D]");
const MOJIBAKE_EURO = "\u00E2\u20AC";
const decoder = new TextDecoder("utf-8", { fatal: true });

const files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8"
})
  .split("\0")
  .filter(Boolean);

const problems = [];

for (const file of files) {
  const ext = file.slice(file.lastIndexOf(".")).toLowerCase();
  if (BINARY_EXT.has(ext)) continue;

  let bytes;
  try {
    bytes = readFileSync(file);
  } catch {
    continue;
  }
  if (bytes.length === 0) continue;
  if (bytes.subarray(0, 8192).includes(0)) continue;

  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    problems.push(`${file}: tiene BOM`);
    continue;
  }

  let text = "";
  try {
    text = decoder.decode(bytes);
  } catch {
    problems.push(`${file}: no es UTF-8 valido`);
    continue;
  }

  if (text.includes("\r\n")) problems.push(`${file}: tiene CRLF (usa LF)`);
  if (MOJIBAKE.test(text) || text.includes(MOJIBAKE_EURO)) {
    problems.push(`${file}: doble codificacion, acentos rotos`);
  }
}

if (problems.length > 0) {
  console.error(`UTF-8 check FAILED (${problems.length}):`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`UTF-8 check OK: ${files.length} ficheros revisados`);
