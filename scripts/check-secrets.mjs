import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const trackedFiles = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter((file) => /^(app|src|prisma|tests|scripts|\.github\/workflows)\//.test(file) || /^(next\.config|playwright\.config|jest\.config|eslint\.config|package\.json|tsconfig\.json)$/.test(file));

const binaryExtensions = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".woff", ".woff2", ".zip"]);
const findings = [];

const patterns = [
  { name: "private key", regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b/ },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "Stripe secret key", regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/ },
  { name: "public secret environment variable", regex: /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PASSWORD|TOKEN|PRIVATE_KEY|PRIVATE)[A-Z0-9_]*/ },
];

for (const file of trackedFiles) {
  if (binaryExtensions.has(extname(file).toLowerCase())) continue;
  const content = readFileSync(file, "utf8");
  for (const { name, regex } of patterns) {
    if (regex.test(content)) findings.push(`${file}: ${name}`);
  }
}

if (findings.length) {
  console.error("Potential secret exposure detected:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Secret scan passed: ${trackedFiles.length} tracked source/config files checked.`);
