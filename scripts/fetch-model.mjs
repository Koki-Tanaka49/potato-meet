import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const MODEL_SHA256 = "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const modelDirectory = path.join(root, "public/models");
const modelPath = path.join(modelDirectory, "face_landmarker.task");
const temporaryPath = `${modelPath}.download`;

function sha256(data) {
  return createHash("sha256").update(data).digest("hex");
}

async function currentModel() {
  try {
    return await readFile(modelPath);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw error;
  }
}

const existing = await currentModel();
if (existing) {
  const actualHash = sha256(existing);
  if (actualHash !== MODEL_SHA256) {
    throw new Error(`顔検出モデルのSHA-256が一致しません: ${actualHash}`);
  }
  console.log("検証済みの顔検出モデルを使用します。");
} else {
  const response = await fetch(MODEL_URL);
  if (!response.ok) {
    throw new Error(`顔検出モデルを取得できませんでした: HTTP ${response.status}`);
  }

  const downloaded = Buffer.from(await response.arrayBuffer());
  const actualHash = sha256(downloaded);
  if (actualHash !== MODEL_SHA256) {
    throw new Error(`取得した顔検出モデルのSHA-256が一致しません: ${actualHash}`);
  }

  await mkdir(modelDirectory, { recursive: true });
  await rm(temporaryPath, { force: true });
  await writeFile(temporaryPath, downloaded, { flag: "wx" });
  await rename(temporaryPath, modelPath);
  console.log("公式配布元から顔検出モデルを取得し、SHA-256を確認しました。");
}
