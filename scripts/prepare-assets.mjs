import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) {
  throw new Error("使い方: npm run assets -- <素材画像のパス>");
}

const output = path.join(process.cwd(), "public/potato");
await mkdir(output, { recursive: true });
const metadata = await sharp(source).metadata();

if (!metadata.width || !metadata.height) {
  throw new Error("素材画像のサイズを取得できませんでした。");
}

const halfWidth = Math.floor(metadata.width / 2);
const halfHeight = Math.floor(metadata.height / 2);
const lowerRowTop = Math.floor(metadata.height * 0.64);
const bodyHeight = lowerRowTop;

const assets = [
  {
    name: "potato-body.png",
    extract: { left: 0, top: 0, width: halfWidth, height: bodyHeight },
    width: 512
  },
  {
    name: "mouth-closed.png",
    extract: { left: 0, top: lowerRowTop, width: halfWidth, height: metadata.height - lowerRowTop },
    width: 320
  },
  {
    name: "mouth-open.png",
    extract: { left: halfWidth, top: lowerRowTop, width: metadata.width - halfWidth, height: metadata.height - lowerRowTop },
    width: 320
  }
];

await Promise.all(
  assets.map(async ({ name, extract, width }) => {
    const cropped = await sharp(source)
      .extract(extract)
      .png()
      .toBuffer();
    await sharp(cropped)
      .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .resize({ width, withoutEnlargement: true })
      .png()
      .toFile(path.join(output, name));
  })
);

console.log("目を除いたポテト本体と口の素材を出力しました。");
