import { createHash } from "node:crypto";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import {
  mkdir,
  readdir,
  readFile,
  writeFile
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const distDirectory = path.join(root, "dist");
const artifactsDirectory = path.join(root, "artifacts");

const LOCAL_FILE_SIGNATURE = 0x04034b50;
const CENTRAL_DIRECTORY_SIGNATURE = 0x02014b50;
const END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const UTF8_FLAG = 0x0800;
const MAX_UINT16 = 0xffff;
const MAX_UINT32 = 0xffffffff;

const forbiddenDirectoryNames = new Set([
  "__snapshots__",
  "__tests__",
  "coverage",
  "node_modules",
  "test",
  "test-results",
  "tests"
]);
const forbiddenFileNames = new Set([
  "icons/potato-meet-icon-generated-source.png",
  "icons/potato-meet-icon-master.png"
]);
const expectedIconPaths = new Map([
  ["16", "icons/icon-16.png"],
  ["32", "icons/icon-32.png"],
  ["48", "icons/icon-48.png"],
  ["128", "icons/icon-128.png"]
]);

const crc32Table = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(data) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function toDosDateTime() {
  // A fixed timestamp makes the archive reproducible. SOURCE_DATE_EPOCH can
  // be supplied by a release build when a different deterministic timestamp
  // is required.
  const epoch = Number(process.env.SOURCE_DATE_EPOCH);
  const date = Number.isFinite(epoch)
    ? new Date(Math.max(0, epoch) * 1000)
    : new Date(Date.UTC(1980, 0, 1));
  const year = Math.min(2107, Math.max(1980, date.getUTCFullYear()));
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = Math.floor(date.getUTCSeconds() / 2);
  return {
    time: (hours << 11) | (minutes << 5) | seconds,
    date: ((year - 1980) << 9) | (month << 5) | day
  };
}

function ensureUint32(value, label) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_UINT32) {
    throw new Error(`${label}がZIP形式の上限を超えています。`);
  }
}

function assertSafeArchiveName(name) {
  if (
    name.length === 0 ||
    name.includes("\\") ||
    name.startsWith("/") ||
    /^[A-Za-z]:/.test(name) ||
    name.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error(`安全でないZIP内パスです: ${name}`);
  }
}

function rejectionReason(name) {
  const parts = name.split("/");
  if (parts.some((part) => part.startsWith("."))) return "隠しファイル";
  if (forbiddenFileNames.has(name.toLowerCase())) return "配布に不要な画像原版";
  if (parts.some((part) => forbiddenDirectoryNames.has(part.toLowerCase()))) {
    return "テストまたは依存関係のファイル";
  }
  if (name.toLowerCase().endsWith(".map")) return "ソースマップ";
  if (/(^|[._-])(test|spec)(?:[._-]|$)/i.test(parts.at(-1))) {
    return "テストファイル";
  }
  return null;
}

function validateManifestIcons(manifest, names) {
  for (const [size, expectedPath] of expectedIconPaths) {
    if (manifest.icons?.[size] !== expectedPath) {
      throw new Error(`manifest.jsonのicons.${size}が${expectedPath}ではありません。`);
    }
    if (manifest.action?.default_icon?.[size] !== expectedPath) {
      throw new Error(`manifest.jsonのaction.default_icon.${size}が${expectedPath}ではありません。`);
    }
    if (!names.has(expectedPath)) {
      throw new Error(`manifest.jsonが参照するアイコンがZIPにありません: ${expectedPath}`);
    }
  }
}

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const relativeName = prefix ? `${prefix}/${entry.name}` : entry.name;
    assertSafeArchiveName(relativeName);

    if (entry.isSymbolicLink()) {
      throw new Error(`配布物にシンボリックリンクを含めることはできません: ${relativeName}`);
    }
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path.join(directory, entry.name), relativeName)));
      continue;
    }
    if (!entry.isFile()) {
      throw new Error(`通常のファイルではない配布物があります: ${relativeName}`);
    }

    const reason = rejectionReason(relativeName);
    if (reason) {
      throw new Error(`配布物に${reason}が含まれています: ${relativeName}`);
    }
    files.push({ name: relativeName, data: await readFile(path.join(directory, entry.name)) });
  }

  return files;
}

function makeLocalHeader(name, method, compressedSize, uncompressedSize, checksum, timestamp) {
  const nameBytes = Buffer.from(name, "utf8");
  if (nameBytes.length > MAX_UINT16) throw new Error(`ZIP内パスが長すぎます: ${name}`);
  const header = Buffer.alloc(30 + nameBytes.length);
  header.writeUInt32LE(LOCAL_FILE_SIGNATURE, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(UTF8_FLAG, 6);
  header.writeUInt16LE(method, 8);
  header.writeUInt16LE(timestamp.time, 10);
  header.writeUInt16LE(timestamp.date, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(uncompressedSize, 22);
  header.writeUInt16LE(nameBytes.length, 26);
  header.writeUInt16LE(0, 28);
  nameBytes.copy(header, 30);
  return header;
}

function makeCentralDirectoryEntry(
  name,
  method,
  compressedSize,
  uncompressedSize,
  checksum,
  timestamp,
  localHeaderOffset
) {
  const nameBytes = Buffer.from(name, "utf8");
  if (nameBytes.length > MAX_UINT16) throw new Error(`ZIP内パスが長すぎます: ${name}`);
  const entry = Buffer.alloc(46 + nameBytes.length);
  entry.writeUInt32LE(CENTRAL_DIRECTORY_SIGNATURE, 0);
  entry.writeUInt16LE(20, 4);
  entry.writeUInt16LE(20, 6);
  entry.writeUInt16LE(UTF8_FLAG, 8);
  entry.writeUInt16LE(method, 10);
  entry.writeUInt16LE(timestamp.time, 12);
  entry.writeUInt16LE(timestamp.date, 14);
  entry.writeUInt32LE(checksum, 16);
  entry.writeUInt32LE(compressedSize, 20);
  entry.writeUInt32LE(uncompressedSize, 24);
  entry.writeUInt16LE(nameBytes.length, 28);
  entry.writeUInt16LE(0, 30);
  entry.writeUInt16LE(0, 32);
  entry.writeUInt16LE(0, 34);
  entry.writeUInt16LE(0, 36);
  entry.writeUInt32LE(0, 38);
  entry.writeUInt32LE(localHeaderOffset, 42);
  nameBytes.copy(entry, 46);
  return entry;
}

function createZip(files) {
  const timestamp = toDosDateTime();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const file of files) {
    const checksum = crc32(file.data);
    const compressed = deflateRawSync(file.data, { level: 9 });
    const method = compressed.length < file.data.length ? 8 : 0;
    const payload = method === 8 ? compressed : file.data;
    ensureUint32(file.data.length, `非圧縮サイズ (${file.name})`);
    ensureUint32(payload.length, `圧縮サイズ (${file.name})`);
    ensureUint32(offset, "ZIP内オフセット");
    const localHeader = makeLocalHeader(
      file.name,
      method,
      payload.length,
      file.data.length,
      checksum,
      timestamp
    );
    localParts.push(localHeader, payload);
    centralParts.push(
      makeCentralDirectoryEntry(
        file.name,
        method,
        payload.length,
        file.data.length,
        checksum,
        timestamp,
        offset
      )
    );
    offset += localHeader.length + payload.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  ensureUint32(centralDirectory.length, "中央ディレクトリサイズ");
  ensureUint32(offset, "中央ディレクトリオフセット");
  if (files.length > MAX_UINT16) throw new Error("ZIP内のファイル数が上限を超えています。");

  const end = Buffer.alloc(22);
  end.writeUInt32LE(END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function findEndOfCentralDirectory(buffer) {
  const minimumOffset = Math.max(0, buffer.length - (0xffff + 22));
  for (let offset = buffer.length - 22; offset >= minimumOffset; offset -= 1) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY_SIGNATURE) return offset;
  }
  throw new Error("ZIPの終了レコードが見つかりません。");
}

function inspectZip(buffer) {
  if (buffer.length < 22) throw new Error("ZIPが短すぎます。");
  const endOffset = findEndOfCentralDirectory(buffer);
  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDisk = buffer.readUInt16LE(endOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  const entryCount = buffer.readUInt16LE(endOffset + 10);
  const centralSize = buffer.readUInt32LE(endOffset + 12);
  const centralOffset = buffer.readUInt32LE(endOffset + 16);
  const commentLength = buffer.readUInt16LE(endOffset + 20);

  if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) {
    throw new Error("分割されたZIPは検査できません。");
  }
  if (endOffset + 22 + commentLength !== buffer.length) {
    throw new Error("ZIPの終了レコードが壊れています。");
  }
  if (centralOffset + centralSize > endOffset) {
    throw new Error("ZIPの中央ディレクトリ範囲が不正です。");
  }

  const files = [];
  const names = new Set();
  let offset = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_SIGNATURE) {
      throw new Error("ZIPの中央ディレクトリが壊れています。");
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const fileCommentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const entryEnd = offset + 46 + nameLength + extraLength + fileCommentLength;
    if (entryEnd > buffer.length) throw new Error("ZIPのエントリ範囲が不正です。");

    const name = buffer.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
    assertSafeArchiveName(name);
    const reason = rejectionReason(name);
    if (reason) throw new Error(`ZIPに${reason}が含まれています: ${name}`);
    if (names.has(name)) throw new Error(`ZIPに重複したファイルがあります: ${name}`);
    names.add(name);
    if ((flags & 1) !== 0 || (flags & 8) !== 0) {
      throw new Error(`暗号化またはデータディスクリプタ付きのZIPは検査できません: ${name}`);
    }
    if (localHeaderOffset + 30 > buffer.length || buffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_SIGNATURE) {
      throw new Error(`ZIPのローカルヘッダーが不正です: ${name}`);
    }
    const localFlags = buffer.readUInt16LE(localHeaderOffset + 6);
    const localMethod = buffer.readUInt16LE(localHeaderOffset + 8);
    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const localName = buffer
      .subarray(localHeaderOffset + 30, localHeaderOffset + 30 + localNameLength)
      .toString("utf8");
    if (localFlags !== flags || localMethod !== method || localName !== name) {
      throw new Error(`ZIPのローカルヘッダーと中央ディレクトリが一致しません: ${name}`);
    }
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > centralOffset || dataEnd > buffer.length) {
      throw new Error(`ZIPのデータ範囲が不正です: ${name}`);
    }

    const compressedData = buffer.subarray(dataStart, dataEnd);
    let data;
    if (method === 0) data = compressedData;
    else if (method === 8) data = inflateRawSync(compressedData);
    else throw new Error(`対応していない圧縮方式です (${method}): ${name}`);
    if (data.length !== uncompressedSize || crc32(data) !== buffer.readUInt32LE(offset + 16)) {
      throw new Error(`ZIPのCRCまたはサイズが一致しません: ${name}`);
    }
    files.push({ name, data });
    offset = entryEnd;
  }
  if (offset !== centralOffset + centralSize) {
    throw new Error("ZIPの中央ディレクトリサイズが一致しません。");
  }

  const manifest = files.find((file) => file.name === "manifest.json");
  if (!manifest) throw new Error("manifest.jsonがZIP直下にありません。");
  try {
    const manifestJson = JSON.parse(manifest.data.toString("utf8"));
    if (!manifestJson || typeof manifestJson !== "object" || typeof manifestJson.version !== "string") {
      throw new Error("versionがありません。");
    }
    validateManifestIcons(manifestJson, names);
  } catch (error) {
    throw new Error(`ZIP内のmanifest.jsonを読み取れません: ${error.message}`);
  }

  return { fileCount: files.length, files };
}

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function loadPackageVersion() {
  const packageJson = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  if (typeof packageJson.name !== "string" || typeof packageJson.version !== "string") {
    throw new Error("package.jsonのnameまたはversionが不正です。");
  }
  if (!/^[A-Za-z0-9._-]+$/.test(packageJson.name)) {
    throw new Error(`package.jsonのnameをファイル名に使えません: ${packageJson.name}`);
  }
  return packageJson;
}

async function loadManifestVersion() {
  const manifestPath = path.join(distDirectory, "manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error("dist/manifest.jsonのversionが不正です。");
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(manifest.version)) {
    throw new Error(`manifest.jsonのversionをファイル名に使えません: ${manifest.version}`);
  }
  return manifest.version;
}

function printReport(archivePath, archive, fileCount) {
  console.log(`Chromeウェブストア提出用ZIP: ${path.relative(root, archivePath)}`);
  console.log(`展開検査: 成功（manifest.jsonと4サイズのアイコンを含む${fileCount}ファイル）`);
  console.log(`圧縮後サイズ: ${archive.length} bytes`);
  console.log(`SHA-256: ${sha256(archive)}`);
}

async function packageDistribution() {
  const packageJson = await loadPackageVersion();
  const manifestVersion = await loadManifestVersion();
  if (packageJson.version !== manifestVersion) {
    throw new Error(`package.json (${packageJson.version}) とmanifest.json (${manifestVersion}) のversionが一致しません。`);
  }
  const files = await collectFiles(distDirectory);
  if (!files.some((file) => file.name === "manifest.json")) {
    throw new Error("manifest.jsonがdist直下にありません。");
  }

  const archive = createZip(files.sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)));
  const archivePath = path.join(artifactsDirectory, `${packageJson.name}-${manifestVersion}.zip`);
  await mkdir(artifactsDirectory, { recursive: true });
  await writeFile(archivePath, archive);

  const report = inspectZip(archive);
  printReport(archivePath, archive, report.fileCount);
  return archivePath;
}

async function checkExistingArchive(archiveArgument) {
  const packageJson = await loadPackageVersion();
  const manifestVersion = await loadManifestVersion();
  if (packageJson.version !== manifestVersion) {
    throw new Error(`package.json (${packageJson.version}) とmanifest.json (${manifestVersion}) のversionが一致しません。`);
  }
  const archivePath = archiveArgument
    ? path.resolve(root, archiveArgument)
    : path.join(artifactsDirectory, `${packageJson.name}-${manifestVersion}.zip`);
  const archive = await readFile(archivePath);
  const report = inspectZip(archive);
  printReport(archivePath, archive, report.fileCount);
}

const [command, archiveArgument, ...unexpectedArguments] = process.argv.slice(2);
if (unexpectedArguments.length > 0 || (command && command !== "--check")) {
  throw new Error("使い方: node scripts/package.mjs [--check [ZIPのパス]]");
}

if (command === "--check") await checkExistingArchive(archiveArgument);
else await packageDistribution();
