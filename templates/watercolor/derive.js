/**
 * 从 assets/bg_wash.jpg（整页水彩背景）派生出其他背景：
 *   bg_content.jpg   内容页：白纸，只在右下角保留一小片变淡的水彩
 *   bg_soft.jpg      金句 / 目录页：整页水彩整体提亮一些
 * 由 tools/gen_assets.js 在生成图片后自动调用；也可以单独运行：node templates/watercolor/derive.js
 */
const path = require("path");
const sharp = require("sharp");

async function derive(assetsDir) {
  const src = path.join(assetsDir, "bg_wash.jpg");
  const W = 1920, H = 1080;
  const wash = await sharp(src).resize(W, H, { fit: "cover" }).toBuffer();

  // 内容页：右下角径向渐隐 + 提亮
  const mask = `<svg width="${W}" height="${H}"><defs><radialGradient id="g" cx="${W}" cy="${H}" r="760" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#fff" stop-opacity="0.85"/><stop offset="0.55" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    <rect width="${W}" height="${H}" fill="url(#g)"/></svg>`;
  const corner = await sharp(wash).ensureAlpha().composite([{ input: Buffer.from(mask), blend: "dest-in" }]).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: "#FFFFFF" } })
    .composite([{ input: corner }]).jpeg({ quality: 88 }).toFile(path.join(assetsDir, "bg_content.jpg"));

  // 柔和版：整页提亮 35%
  const veil = `<svg width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#fff" fill-opacity="0.35"/></svg>`;
  await sharp(wash).composite([{ input: Buffer.from(veil) }]).jpeg({ quality: 88 }).toFile(path.join(assetsDir, "bg_soft.jpg"));
  console.log("[derive] ✓ bg_content.jpg、bg_soft.jpg");
}

module.exports = derive;
if (require.main === module) derive(path.join(__dirname, "assets")).catch((e) => { console.error(e); process.exit(1); });
