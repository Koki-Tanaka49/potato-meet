import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = path.join(root, "public", "icons");
const storeAssetsDir = path.join(root, "docs", "store-assets");
const generatedSourcePath = path.join(iconsDir, "potato-meet-icon-generated-source.png");
const masterPath = path.join(iconsDir, "potato-meet-icon-master.png");
const browserScreenshotPath = path.join(root, "docs", "images", "potato-meet-browser.png");

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };
const iconSizes = new Map([
  [16, 16],
  [32, 30],
  [48, 44],
  [128, 96]
]);

await mkdir(iconsDir, { recursive: true });
await mkdir(storeAssetsDir, { recursive: true });

// Preserve the approved artwork exactly. Validate the image-generation export
// before it becomes the production master so a flattened preview cannot slip in.
const sourceMetadata = await sharp(generatedSourcePath).metadata();
if (
  sourceMetadata.width !== 1254 ||
  sourceMetadata.height !== 1254 ||
  sourceMetadata.hasAlpha !== true
) {
  throw new Error(
    "The icon source must be a 1254 x 1254 PNG with an alpha channel."
  );
}
await sharp(generatedSourcePath).ensureAlpha().png().toFile(masterPath);

// Remove the generous image-generation canvas margin while preserving alpha.
const trimmedIcon = await sharp(masterPath)
  .trim({ background: transparent })
  .png()
  .toBuffer();

for (const [size, contentSize] of iconSizes) {
  const content = await sharp(trimmedIcon)
    .resize(contentSize, contentSize, {
      fit: "contain",
      kernel: sharp.kernel.lanczos3,
      background: transparent
    })
    .png()
    .toBuffer();
  const gap = size - contentSize;
  await sharp(content)
    .extend({
      top: Math.floor(gap / 2),
      bottom: Math.ceil(gap / 2),
      left: Math.floor(gap / 2),
      right: Math.ceil(gap / 2),
      background: transparent
    })
    .png()
    .toFile(path.join(iconsDir, `icon-${size}.png`));
}

const promoIcon = await sharp(trimmedIcon)
  .resize(220, 220, { fit: "contain", kernel: sharp.kernel.lanczos3, background: transparent })
  .png()
  .toBuffer();

const smallPromoBackdrop = Buffer.from(`
  <svg width="440" height="280" xmlns="http://www.w3.org/2000/svg">
    <rect width="440" height="280" fill="#fff7e8"/>
    <circle cx="30" cy="42" r="82" fill="#b95508"/>
    <circle cx="419" cy="252" r="104" fill="#f7b33b"/>
    <rect x="100" y="20" width="240" height="240" rx="64" fill="#ffffff"/>
    <circle cx="329" cy="55" r="11" fill="#d5680a"/>
  </svg>
`);

await sharp({ create: { width: 440, height: 280, channels: 4, background: "#fff7e8" } })
  .composite([
    { input: smallPromoBackdrop, left: 0, top: 0 },
    { input: promoIcon, left: 110, top: 30 }
  ])
  .png()
  .toFile(path.join(storeAssetsDir, "potato-meet-promo-440x280.png"));

const browserScreenshot = await sharp(browserScreenshotPath)
  .resize(760, 428, { fit: "cover", kernel: sharp.kernel.lanczos3 })
  .composite([
    {
      input: Buffer.from('<svg width="760" height="428" xmlns="http://www.w3.org/2000/svg"><rect width="760" height="428" rx="24" fill="white"/></svg>'),
      blend: "dest-in"
    }
  ])
  .png()
  .toBuffer();

const marqueeIcon = await sharp(trimmedIcon)
  .resize(360, 360, { fit: "contain", kernel: sharp.kernel.lanczos3, background: transparent })
  .png()
  .toBuffer();

const marqueeBackdrop = Buffer.from(`
  <svg width="1400" height="560" xmlns="http://www.w3.org/2000/svg">
    <rect width="1400" height="560" fill="#fff7e8"/>
    <circle cx="62" cy="506" r="190" fill="#b95508"/>
    <circle cx="1360" cy="40" r="176" fill="#f7b33b"/>
    <rect x="54" y="60" width="440" height="440" rx="112" fill="#ffffff"/>
    <rect x="550" y="42" width="816" height="476" rx="38" fill="#ffffff" stroke="#b95508" stroke-width="4"/>
    <circle cx="468" cy="100" r="16" fill="#d5680a"/>
  </svg>
`);

await sharp({ create: { width: 1400, height: 560, channels: 4, background: "#fff7e8" } })
  .composite([
    { input: marqueeBackdrop, left: 0, top: 0 },
    { input: marqueeIcon, left: 94, top: 100 },
    { input: browserScreenshot, left: 578, top: 66 }
  ])
  .png()
  .toFile(path.join(storeAssetsDir, "potato-meet-marquee-1400x560.png"));

console.log("Generated extension icons and Chrome Web Store promotional images.");
