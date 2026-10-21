import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const mark = await readFile(new URL("public/landing/a-lot-more/mark.svg", root), "utf8");
// Preserve the approved website mark, inset inside Android's mask-safe area.
const artwork = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#F5F5F0"/><svg x="96" y="96" width="320" height="320" viewBox="0 0 48 48">${mark.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "")}</svg></svg>`;
const render = (size) => sharp(Buffer.from(artwork)).resize(size, size).png().toBuffer();
for (const size of [180, 192, 512]) {
  await writeFile(new URL(`public/icon-${size}.png`, root), await render(size));
}
await writeFile(new URL("public/icon-maskable-512.png", root), await render(512));
await writeFile(new URL("native/android/store_icon.png", root), await render(512));
await writeFile(new URL("public/favicon.svg", root), artwork + "\n");
const favicon = await render(32);
const header = Buffer.alloc(22);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);
header[6] = 32;
header[7] = 32;
header.writeUInt16LE(1, 10);
header.writeUInt16LE(32, 12);
header.writeUInt32LE(favicon.length, 14);
header.writeUInt32LE(22, 18);
await writeFile(new URL("public/favicon.ico", root), Buffer.concat([header, favicon]));
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  for (const name of ["ic_launcher", "ic_maskable"]) {
    const target = new URL(`native/android/app/src/main/res/mipmap-${density}/${name}.png`, root);
    await writeFile(target, await render(size));
  }
  for (const name of ["shortcut_0", "shortcut_1", "splash"]) {
    const target = new URL(`native/android/app/src/main/res/drawable-${density}/${name}.png`, root);
    const { width } = await sharp(await readFile(target)).metadata();
    await writeFile(target, await render(width));
  }
  // Android small notification icons use a white silhouette on transparency.
  const notification = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M27 9H9v30h30V21M24 24 39 9M28 9h11v11" fill="none" stroke="white" stroke-width="4"/></svg>`;
  await writeFile(new URL(`native/android/app/src/main/res/drawable-${density}/ic_notification_icon.png`, root),
    await sharp(Buffer.from(notification)).resize(size / 2, size / 2).png().toBuffer());
}

// Transparent background versions
const markContentClean = mark
  .replace(/^<svg[^>]*>/, "")
  .replace(/<\/svg>\s*$/, "")
  .replace(/<rect width="48" height="48"[^>]*\/>/, "")
  .trim();
const artworkTransparent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><svg x="96" y="96" width="320" height="320" viewBox="0 0 48 48">${markContentClean}</svg></svg>`;
const artworkTrimmed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${markContentClean}</svg>`;

await writeFile(new URL("public/icon-512-transparent.png", root), await sharp(Buffer.from(artworkTransparent)).resize(512, 512).png({ compressionLevel: 9 }).toBuffer());
await writeFile(new URL("public/logo-transparent.png", root), await sharp(Buffer.from(artworkTrimmed)).resize(512, 512).png({ compressionLevel: 9 }).toBuffer());
await writeFile(new URL("public/icon-transparent.svg", root), artworkTransparent + "\n");
await writeFile(new URL("public/logo-transparent.svg", root), artworkTrimmed + "\n");

console.log(`Rendered app icons from ${fileURLToPath(new URL("public/landing/a-lot-more/mark.svg", root))}`);
