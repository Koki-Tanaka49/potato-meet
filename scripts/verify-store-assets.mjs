import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const expected = new Map([
  ["public/icons/potato-meet-icon-generated-source.png", [1254, 1254, true]],
  ["public/icons/potato-meet-icon-master.png", [1254, 1254, true]],
  ["public/icons/icon-16.png", [16, 16, true]],
  ["public/icons/icon-32.png", [32, 32, true]],
  ["public/icons/icon-48.png", [48, 48, true]],
  ["public/icons/icon-128.png", [128, 128, true]],
  ["docs/store-assets/potato-meet-promo-440x280.png", [440, 280, false]],
  ["docs/store-assets/potato-meet-marquee-1400x560.png", [1400, 560, false]],
  ["docs/store-assets/potato-meet-screenshot-1280x800.png", [1280, 800, false]]
]);

for (const [relativePath, [expectedWidth, expectedHeight, needsTransparency]] of expected) {
  const image = sharp(path.join(root, relativePath));
  const metadata = await image.metadata();
  const stats = await image.stats();
  if (metadata.width !== expectedWidth || metadata.height !== expectedHeight) {
    throw new Error(`${relativePath}: ${expectedWidth}x${expectedHeight} ではありません。`);
  }
  if (needsTransparency && (!metadata.hasAlpha || stats.isOpaque)) {
    throw new Error(`${relativePath}: 透過背景がありません。`);
  }
  console.log(`${relativePath}\t${metadata.width}x${metadata.height}\t${stats.isOpaque ? "opaque" : "transparent"}`);
}

const icon128 = await sharp(path.join(root, "public", "icons", "icon-128.png"))
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let minX = icon128.info.width;
let minY = icon128.info.height;
let maxX = -1;
let maxY = -1;
for (let y = 0; y < icon128.info.height; y += 1) {
  for (let x = 0; x < icon128.info.width; x += 1) {
    const alpha = icon128.data[(y * icon128.info.width + x) * 4 + 3];
    if (alpha === 0) continue;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
}
const contentWidth = maxX - minX + 1;
const contentHeight = maxY - minY + 1;
const right = icon128.info.width - 1 - maxX;
const bottom = icon128.info.height - 1 - maxY;
if (contentWidth > 96 || contentHeight > 96 || minX < 16 || minY < 16 || right < 16 || bottom < 16) {
  throw new Error("icon-128.png: 図柄が96pxまたは周囲16pxの透過余白を超えています。");
}
console.log(`icon-128 content\t${contentWidth}x${contentHeight}\tpadding=${minX},${minY},${right},${bottom}`);
