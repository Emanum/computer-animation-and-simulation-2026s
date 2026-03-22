import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const outDir = path.join(rootDir, "dist-submission");

async function getInstalledThreeVersion() {
  const threePkgPath = path.join(rootDir, "node_modules", "three", "package.json");
  const pkgRaw = await readFile(threePkgPath, "utf-8");
  const pkg = JSON.parse(pkgRaw);

  if (!pkg.version) {
    throw new Error("Could not detect installed three version from node_modules.");
  }

  return pkg.version;
}

async function getInstalledMathjsVersion() {
  const mathPkgPath = path.join(rootDir, "node_modules", "mathjs", "package.json");
  const pkgRaw = await readFile(mathPkgPath, "utf-8");
  const pkg = JSON.parse(pkgRaw);

  if (!pkg.version) {
    throw new Error("Could not detect installed mathjs version from node_modules.");
  }

  return pkg.version;
}

function toCdnImportMap(threeVersion, mathVersion) {
  return `  <script type="importmap">\n      {\n        "imports": {\n          "three": "https://cdn.jsdelivr.net/npm/three@${threeVersion}/build/three.module.js",\n          "three/addons/": "https://cdn.jsdelivr.net/npm/three@${threeVersion}/examples/jsm/",\n          "mathjs": "https://cdn.jsdelivr.net/npm/mathjs@${mathVersion}/+esm"\n        }\n      }\n  </script>`;
}

async function build() {
  const threeVersion = await getInstalledThreeVersion();
  const mathVersion = await getInstalledMathjsVersion();
  const indexPath = path.join(rootDir, "index.html");
  const indexHtml = await readFile(indexPath, "utf-8");

  const scriptRegex = /<script type="importmap">[\s\S]*?<\/script>/;
  const submissionImportMap = toCdnImportMap(threeVersion, mathVersion);
  const submissionHtml = indexHtml.replace(scriptRegex, submissionImportMap);

  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  await writeFile(path.join(outDir, "index.html"), submissionHtml, "utf-8");
  await cp(path.join(rootDir, "main.css"), path.join(outDir, "main.css"));
  await cp(path.join(rootDir, "js"), path.join(outDir, "js"), { recursive: true });

  console.log(`Built submission in ${outDir}`);
  console.log(`Using CDN three@${threeVersion} mathjs@${mathVersion}`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
