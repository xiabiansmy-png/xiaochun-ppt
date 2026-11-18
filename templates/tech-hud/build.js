/**
 * Template: Deep Blue Tech HUD (tech-hud)
 * ------------------------------------------------------------------
 * Visual source: the "驾培智链" competition pitch template (deep-blue HUD sci-fi style). Its decorations are vector compositions,
 * cut out with a black/white difference matte and stored as transparent PNGs in assets/ (title bar, sci-fi frames, glows, ring badges…),
 * then reassembled here with pptxgenjs. Inner photo areas of frames use masks (photo_mask / frame_card_mask / panel9_mask) cropped to the frame's own shape.
 *
 * Layout list (keep in sync with meta.json → layouts):
 *   cover     stage                     blue light-ray stage background + huge centered title + subtitle bar + tag capsule (no image frame on this layout)
 *   toc       grid                      title bar shows the TOC title, items in HUD cards (3–8, two rows when > 4)
 *   section   ring | photo              radar ring + big PART number / sci-fi photo frame on the right (only when there is an image)
 *   points3   imageCards | tagList      three sci-fi card frames (one image each) / photo frame on the left + three label bars on the right
 *   points4   columns | grid2x2         four gradient columns / photo frame on the left + 2×2 HUD cards
 *   compare   panels | triad            two panels + VS / tall frames on both sides + round image in the center
 *   stats     badges | chart            photo frame + number rows / bar chart + color legend
 *   timeline  curve                     glowing curve + radar badges (time) + description under each node
 *   imageText frameLeft | frameRight    sci-fi photo frame on the left / on the right (mirrored)
 *   quote     center | portrait         centered quote / round image + quote (only when there is an image)
 *   closing   swoosh                    blue arc on the right + round image + closing words
 *   table     panel        (optional)   gradient panel + table
 *   steps     platforms    (optional)   step cards + glowing platforms with numbers
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const COLOR = {
  bg: "0A2358", navy: "0B3A8C", deep: "06163D", blue: "016DFF", sky: "2F8CFF", cyan: "36F8E6", aqua: "00D0FF",
  gold: "FFC95C", goldL: "FCE79B", white: "FFFFFF", text: "E8F1FF", mist: "BFD6FF", cover: "1546B8", plain: "0A2358",
};
const FONT = { head: "微软雅黑", body: "微软雅黑" };
const ACCENTS = [COLOR.cyan, COLOR.aqua, COLOR.sky, "7FB2FF"];
const PLATE_CX = 6.51;          // horizontal center of the title-bar plate (the original template is slightly left of center)

/* ---------------- Typesetting components ---------------- */
let ctx, MASKS = {}, CURVE = null;
function text(slide, str, o) {
  if (str === undefined || str === null || str === "") return 0;
  const opt = { isTextBox: true, margin: 0, color: COLOR.text, fontFace: FONT.body, fontSize: 12, valign: "top", lineSpacingMultiple: 1.25, ...o };
  const s = o.noBalance ? String(str) : ctx.balance(String(str), { w: opt.w, fontSize: opt.fontSize, bold: opt.bold, charSpacing: opt.charSpacing, lineSpacingMultiple: opt.lineSpacingMultiple });
  delete opt.noBalance;
  slide.addText(s, opt);
  return opt.h;
}
const head = (slide, str, o) => text(slide, str, { fontFace: FONT.head, bold: true, valign: "middle", lineSpacingMultiple: 1.1, ...o });
const oneLine = (str, o) => ctx.fitLine(String(str || ""), o);
const H = (str, o) => (str ? ctx.measure(String(str), { lineSpacingMultiple: 1.25, ...o }).needH + 0.04 : 0);
const FIT = (str, o) => ctx.fit(String(str || ""), { lineSpacingMultiple: 1.1, bold: true, ...o });
/** Big title size: prefer a single line (not below 75% of max), otherwise the largest size that fits within w × h */
function titleSize(str, { w, h, max, min }) {
  const one = oneLine(str, { w, max, min: Math.max(min, max * 0.75), bold: true });
  if (ctx.measure(String(str), { w, fontSize: one, bold: true }).lines === 1) return one;
  return FIT(str, { w, h, max, min });
}
const longest = (str, o) => ctx.measure(String(str || ""), { w: 30, ...o }).longest || 0;
const num2 = (i) => String(i + 1).padStart(2, "0");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Break a multi-line big title into near-equal lines (prefer breaking after punctuation), so the real render doesn't leave 1–2 chars on the last line */
const BREAK_AFTER = /[，。、；：！？,.;:!?）》”]/, NO_START = /^[，。、；：！？,.;:!?）》”]/;
function evenBreak(str, o) {
  str = String(str ?? "");
  if (!str || str.includes("\n")) return str;
  const m = ctx.measure(str, o);
  if (m.lines <= 1) return str;
  const toks = str.match(/[\u2e80-\uffff]|[^\s\u2e80-\uffff]+\s*|\s+/g) || [];
  const u = (t) => [...t].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2000 ? 0.55 : 1), 0);
  const cum = []; let acc = 0; for (const t of toks) { acc += u(t); cum.push(acc); }
  const join = (brk) => { const out = []; let from = 0; for (const b of [...brk, toks.length - 1]) { out.push(toks.slice(from, b + 1).join("").trimEnd()); from = b + 1; } return out; };
  const fits = (lines) => lines.every((l) => ctx.measure(l, o).lines === 1);
  const score = (i, ideal) => Math.abs(cum[i] - ideal) - (BREAK_AFTER.test(toks[i].trim()) ? 2.2 : 0);
  const cands = (prev, ideal) => toks.map((_, i) => i).filter((i) => i > prev && i < toks.length - 1 && !NO_START.test(toks[i + 1])).sort((a, b) => score(a, ideal) - score(b, ideal));
  if (m.lines === 2) {
    for (const i of cands(-1, acc / 2)) { const out = join([i]); if (fits(out)) return out.join("\n"); }
    return str;
  }
  const brk = [];
  for (let k = 1; k < m.lines; k++) {
    const c = cands(brk.length ? brk[brk.length - 1] : -1, (acc * k) / m.lines);
    if (!c.length) return str;
    brk.push(c[0]);
  }
  const out = join(brk);
  return fits(out) ? out.join("\n") : str;
}

function deco(slide, file, x, y, w, h, name = "装饰static") {
  slide.addImage({ path: ctx.asset(file), x, y, w, h, objectName: name });
}
function line(slide, x, y, w, h, color = COLOR.sky, width = 1) {
  slide.addShape(ctx.shapes.LINE, { x, y, w, h, line: { color, width }, objectName: "线条装饰static" });
}
/** HUD card: translucent deep-blue fill + thin blue border + cyan corner brackets */
function hudBox(slide, x, y, w, h, o = {}) {
  slide.addShape(ctx.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: o.fill || COLOR.navy, transparency: o.tr ?? 35 },
    line: { color: o.line || COLOR.sky, width: 0.75 }, objectName: "卡片",
  });
  const L = Math.min(0.24, w / 5, h / 5), c = o.corner || COLOR.cyan, k = 2.25;
  line(slide, x, y, L, 0, c, k); line(slide, x, y, 0, L, c, k);
  line(slide, x + w - L, y, L, 0, c, k); line(slide, x + w, y, 0, L, c, k);
  line(slide, x, y + h, L, 0, c, k); line(slide, x, y + h - L, 0, L, c, k);
  line(slide, x + w - L, y + h, L, 0, c, k); line(slide, x + w, y + h - L, 0, L, c, k);
}
async function iconImg(slide, name, color, x, y, s, def) {
  slide.addImage({ data: await ctx.icon(name, color, def), x, y, w: s, h: s, objectName: "图标static" });
}
/** Small diamond bullet */
function diamond(slide, x, y, s = 0.13, color = COLOR.cyan) {
  slide.addShape(ctx.shapes.RECTANGLE, { x, y, w: s, h: s, rotate: 45, fill: { color }, line: { type: "none" }, objectName: "菱形装饰static" });
}

/* ---------- Pages and backgrounds ---------- */
function add(s, kind = "content") {
  const master = { content: "HUD_CONTENT", plain: "HUD_PLAIN", cover: "HUD_COVER" }[kind];
  const bg = kind === "cover" ? COLOR.cover : COLOR.bg;
  return ctx.addSlide(s, { master, bg });
}
/** Title-bar plate: eyebrow → section title → deck title; "" means leave it empty */
function plate(slide, s, label) {
  if (label === undefined) label = s.eyebrow !== undefined ? s.eyebrow : (s._sectionTitle || ctx.deck.meta?.title || "");
  if (!label) return;
  const size = oneLine(label, { w: 3.7, max: 24, min: 12, bold: true });
  slide.addText(String(label), {
    isTextBox: true, x: PLATE_CX - 1.85, y: 0.06, w: 3.7, h: 0.58, margin: 0, fontFace: FONT.head, fontSize: size, bold: true,
    color: COLOR.white, align: "center", valign: "middle", objectName: "标题栏装饰static",
  });
}
/** In-page heading: cyan ring dot + gold title + tapering line */
function heading(slide, str, o = {}) {
  const x = o.x ?? 0.85, y = o.y ?? 0.98, w = o.w ?? 11.6, h = o.h ?? 0.58;
  deco(slide, "dot_icon.png", x, y + (h - 0.4) / 2, 0.4, 0.4, "圆点装饰static");
  const tx = x + 0.55, tw = w - 0.55;
  let size = oneLine(str, { w: tw, max: o.max || 28, min: o.min || 20, bold: true });
  let hh = h;
  if (ctx.measure(String(str), { w: tw, fontSize: size, bold: true }).lines > 1) { size = FIT(str, { w: tw, h: o.hMax || h * 2, max: o.max || 28, min: o.min || 20 }); hh = H(str, { w: tw, fontSize: size, bold: true, lineSpacingMultiple: 1.1 }); }
  head(slide, str, { x: tx, y, w: tw, h: hh, fontSize: size, color: COLOR.gold });
  const lx = tx + longest(str, { fontSize: size, bold: true }) + 0.3;
  if (hh <= h + 0.01 && x + w - lx > 1.2) {
    slide.addShape(ctx.shapes.OVAL, { x: lx, y: y + h / 2 - 0.035, w: 0.07, h: 0.07, fill: { color: COLOR.cyan }, line: { type: "none" }, objectName: "线条装饰static" });
    line(slide, lx + 0.07, y + h / 2, Math.min(3.2, x + w - lx - 0.1), 0, COLOR.aqua, 1);
  }
  return y + hh;
}
/** Standard top of a content page: title bar + heading + lead; returns where the body starts */
function top(slide, s, o = {}) {
  plate(slide, s);
  const after = heading(slide, s.title, o);
  if (!s.lead) return Math.max(after + 0.22, o.minTop ?? 1.75);
  const w = o.leadW ?? 11.0, size = 13;
  const h = H(s.lead, { w, fontSize: size });
  text(slide, s.lead, { x: 1.4, y: after + 0.06, w, h, fontSize: size, color: COLOR.mist });
  return Math.max(after + 0.06 + h + 0.22, o.minTop ?? 1.75);
}

/* ---------- Images ---------- */
function altOf(s, idx) {
  const spec = idx === 0 ? s.image : (s.images || [])[idx - 1];
  return spec?.alt || s.image?.alt || s.title || s.text || "";
}
async function applyMask(file, maskName, flip) {
  const sharp = require("sharp");
  const out = path.join(path.dirname(file), `${path.basename(file).replace(/\.\w+$/, "")}_${maskName}${flip ? "_f" : ""}.png`);
  if (fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(file).mtimeMs) return out;
  const m = await sharp(file).metadata();
  const mp = ctx.asset(maskName + ".png"), mm = await sharp(mp).metadata();
  const [fx, fy, fw, fh] = MASKS[maskName];
  let mask = sharp(mp).extract({ left: Math.round(fx * mm.width), top: Math.round(fy * mm.height), width: Math.round(fw * mm.width), height: Math.round(fh * mm.height) });
  if (flip) mask = mask.flop();
  const buf = await mask.resize(m.width, m.height, { fit: "fill" }).png().toBuffer();
  await sharp(file).ensureAlpha().composite([{ input: buf, blend: "dest-in" }]).png().toFile(out);
  return out;
}
/** Photo inside a sci-fi frame: the image is cropped to the frame's photo area and masked to its cut corners, then the frame is laid on top */
async function framed(slide, s, idx, x, y, w, h, { frame, mask, fallback, flip = false }) {
  const [fx, fy, fw, fh] = MASKS[mask];
  const ix = x + (flip ? 1 - fx - fw : fx) * w, iy = y + fy * h, iw = fw * w, ih = fh * h;
  let p = await ctx.image(s, idx, iw, ih, { fallback });
  if (!ctx.dry) p = await applyMask(p, mask, flip);
  slide.addImage({ path: p, x: ix, y: iy, w: iw, h: ih, altText: altOf(s, idx) });
  const fp = flip ? await ctx.prep(frame, w, h, { flip: true, crop: false }) : ctx.asset(frame);
  slide.addImage({ path: fp, x, y, w, h, objectName: "科幻框装饰static" });
}
/** Round image + glowing ring */
async function roundPic(slide, s, idx, cx, cy, d, fallback) {
  const rw = d / 0.36;
  deco(slide, "ring_glow.png", cx - rw * 0.5, cy - rw * 0.5, rw, rw, "光环装饰static");
  await ctx.pic(slide, s, idx, cx - d / 2, cy - d / 2, d, d, { circle: true, fallback });
  slide.addShape(ctx.shapes.OVAL, { x: cx - d / 2 - 0.06, y: cy - d / 2 - 0.06, w: d + 0.12, h: d + 0.12, fill: { type: "none" }, line: { color: COLOR.aqua, width: 2 }, objectName: "圆框装饰static" });
}

/* ============================ Page types ============================ */

async function cover(s) {
  ctx.pickLayout(s, ["stage"]);
  const slide = add(s, "cover");
  const W = 11.0, X = 6.667 - W / 2;
  const rest = (s.subtitle ? 1.0 : 0) + (s.desc ? 0.3 + H(s.desc, { w: 9.4, fontSize: 14 }) : 0) + (s.tag ? 0.9 : 0);
  let tSize = FIT(s.title, { w: W, h: 2.1, max: 80, min: 44, lineSpacingMultiple: 1.05 });
  while (tSize > 44 && H(s.title, { w: W, fontSize: tSize, bold: true, lineSpacingMultiple: 1.05 }) + rest > 4.45) tSize -= 2;
  const title = evenBreak(s.title, { w: W, fontSize: tSize, bold: true });
  const tH = H(title, { w: W, fontSize: tSize, bold: true, lineSpacingMultiple: 1.05 });
  const sSize = s.subtitle ? oneLine(s.subtitle, { w: 8.6, max: 28, min: 16, bold: true }) : 0;
  const barW = s.subtitle ? clamp(longest(s.subtitle, { fontSize: sSize, bold: true }) + 1.6, 5.78, 10.0) : 0;
  const dH = H(s.desc, { w: 9.4, fontSize: 14 });
  const tagS = s.tag ? oneLine(s.tag, { w: 4.6, max: 16, min: 11, bold: true }) : 0;
  const total = tH + (s.subtitle ? 0.3 + 0.7 : 0) + (s.desc ? 0.3 + dH : 0) + (s.tag ? 0.4 + 0.5 : 0);
  let y = 0.85 + Math.max(0, (4.45 - total) * 0.45);
  head(slide, title, {
    x: X, y, w: W, h: tH, fontSize: tSize, color: COLOR.white, align: "center", lineSpacingMultiple: 1.05,
    shadow: { type: "outer", color: COLOR.aqua, blur: 10, offset: 0, angle: 90, opacity: 0.55 },
  });
  y += tH + 0.3;
  if (s.subtitle) {
    deco(slide, "cover_subbar.png", 6.667 - barW / 2, y, barW, 0.7, "副标题框装饰static");
    text(slide, s.subtitle, { x: 6.667 - barW / 2 + 0.3, y: y + 0.02, w: barW - 0.6, h: 0.5, fontSize: sSize, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
    y += 0.7 + 0.3;
  }
  if (s.desc) { text(slide, s.desc, { x: 6.667 - 4.7, y, w: 9.4, h: dH, fontSize: 14, color: COLOR.text, align: "center" }); y += dH + 0.4; }
  if (s.tag) {
    const pw = clamp(longest(s.tag, { fontSize: tagS, bold: true }) + 1.0, 2.6, 5.4);
    deco(slide, "pill.png", 6.667 - pw / 2, y, pw, 0.5, "胶囊装饰static");
    text(slide, s.tag, { x: 6.667 - pw / 2 + 0.2, y, w: pw - 0.4, h: 0.5, fontSize: tagS, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
  }
}

async function toc(s) {
  ctx.pickLayout(s, ["grid"]);
  const slide = add(s);
  plate(slide, s, s.eyebrow !== undefined ? s.eyebrow : (s.title || "目录"));
  const items = s.items || [], n = items.length;
  const cols = n <= 4 ? n : Math.ceil(n / 2), rows = n <= 4 ? 1 : 2;
  const X = 0.9, W = 11.53, gap = 0.3, cw = (W - (cols - 1) * gap) / cols;
  const topY = 1.2, bottom = s.desc ? 5.85 : 6.6;
  const ch = rows === 1 ? Math.min(2.5, bottom - topY) : (bottom - topY - gap) / 2;
  const y0 = rows === 1 ? topY + (bottom - topY - ch) / 2 : topY;
  const hSize = Math.min(...items.map((it) => oneLine(it.head, { w: cw - 0.6, max: 20, min: 13, bold: true })));
  for (let i = 0; i < n; i++) {
    const it = items[i], c = i % cols, r = Math.floor(i / cols);
    const x = X + c * (cw + gap), y = y0 + r * (ch + gap);
    hudBox(slide, x, y, cw, ch);
    const inner = 0.25 + 0.6 + 0.2 + 0.5 + (it.sub ? 0.45 : 0);
    const oy = y + Math.max(0.22, (ch - inner) / 2);
    text(slide, num2(i), { x: x + 0.3, y: oy, w: 1.4, h: 0.6, fontSize: 30, bold: true, color: COLOR.cyan, valign: "middle", noBalance: true, fontFace: FONT.head });
    deco(slide, "glow_thin.png", x + 0.15, oy + 0.66, cw - 0.3, 0.1, "光线装饰static");
    head(slide, it.head, { x: x + 0.3, y: oy + 0.85, w: cw - 0.6, h: 0.48, fontSize: hSize, color: COLOR.gold });
    if (it.sub) text(slide, it.sub, { x: x + 0.3, y: oy + 1.35, w: cw - 0.6, h: H(it.sub, { w: cw - 0.6, fontSize: 12 }), fontSize: 12, color: COLOR.mist });
  }
  if (s.desc) text(slide, s.desc, { x: 1.4, y: 6.12, w: 10.53, h: H(s.desc, { w: 10.53, fontSize: 13 }), fontSize: 13, color: COLOR.mist, align: "center" });
}

/* ---------- Section page ---------- */
function keywordTags(slide, kws, X, y, W, align = "left") {
  if (!kws?.length) return y;
  const size = 13, pad = 0.42, gap = 0.16;
  const ws = kws.map((k) => longest(k, { fontSize: size, bold: true }) + pad);
  const rows = [[]]; let acc = 0;
  ws.forEach((w, i) => { if (acc + w > W && rows[rows.length - 1].length) { rows.push([]); acc = 0; } rows[rows.length - 1].push(i); acc += w + gap; });
  for (const row of rows) {
    const rw = row.reduce((a, i) => a + ws[i], 0) + (row.length - 1) * gap;
    let x = align === "center" ? X + (W - rw) / 2 : X;
    for (const i of row) {
      slide.addShape(ctx.shapes.RECTANGLE, { x, y, w: ws[i], h: 0.42, fill: { color: COLOR.navy, transparency: 40 }, line: { color: COLOR.aqua, width: 1 }, objectName: "标签" });
      text(slide, kws[i], { x, y, w: ws[i], h: 0.42, fontSize: size, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
      x += ws[i] + gap;
    }
    y += 0.42 + 0.14;
  }
  return y - 0.14;
}
async function section(s) {
  const layout = ctx.pickLayout(s, s.image ? ["ring", "photo"] : ["ring"]);
  const slide = add(s, "plain");
  const no = String(s._sectionNo || 1).padStart(2, "0");
  if (layout === "ring") {
    const rx = 0.95, ry = 1.45, rw = 4.1, rh = rw / 0.88;
    deco(slide, "node_badge.png", rx, ry, rw, rh, "雷达环装饰static");
    const cx = rx + rw * 0.497, cy = ry + rh * 0.563;
    text(slide, "PART", { x: cx - 1.2, y: cy - 1.0, w: 2.4, h: 0.4, fontSize: 16, bold: true, charSpacing: 4, color: COLOR.mist, align: "center", valign: "middle", noBalance: true });
    text(slide, no, { x: cx - 1.4, y: cy - 0.72, w: 2.8, h: 1.75, fontSize: 80, bold: true, color: COLOR.cyan, align: "center", valign: "middle", noBalance: true, fontFace: FONT.head });
    const X = 5.9, W = 6.5;
    const tSize = titleSize(s.title, { w: W, h: 1.55, max: 54, min: 36 });
    const tH = H(s.title, { w: W, fontSize: tSize, bold: true, lineSpacingMultiple: 1.1 });
    const enH = s.en ? 0.4 : 0, dH = H(s.desc, { w: W, fontSize: 14 });
    const kwH = s.keywords?.length ? (longest(s.keywords.join("  "), { fontSize: 13, bold: true }) + s.keywords.length * 0.58 > W ? 0.98 : 0.42) : 0;
    const total = enH + (enH ? 0.1 : 0) + tH + 0.45 + (kwH ? kwH + 0.35 : 0) + dH;
    let y = Math.max(1.2, 3.75 - total / 2);
    if (s.en) { text(slide, s.en.toUpperCase(), { x: X, y, w: W, h: 0.4, fontSize: oneLine(s.en.toUpperCase(), { w: W, max: 16, min: 11, bold: true, charSpacing: 3 }), bold: true, charSpacing: 3, color: COLOR.aqua, valign: "middle", noBalance: true }); y += 0.5; }
    head(slide, evenBreak(s.title, { w: W, fontSize: tSize, bold: true }), { x: X, y, w: W, h: tH, fontSize: tSize, color: COLOR.white });
    y += tH + 0.05;
    deco(slide, "glow_line.png", X - 0.6, y - 0.1, W + 0.6, 0.5, "光线装饰static");
    y += 0.4;
    if (kwH) y = keywordTags(slide, s.keywords, X, y, W) + 0.35;
    if (s.desc) text(slide, s.desc, { x: X, y, w: W, h: dH, fontSize: 14, color: COLOR.mist });
  } else { // photo
    await framed(slide, s, 0, 6.55, 1.75, 6.1, 6.1 / 1.551, { frame: "photo_frame.png", mask: "photo_mask", fallback: "photo_city.jpg" });
    const X = 0.95, W = 5.25;
    const tSize = titleSize(s.title, { w: W, h: 1.6, max: 48, min: 32 });
    const tH = H(s.title, { w: W, fontSize: tSize, bold: true, lineSpacingMultiple: 1.1 });
    const dH = H(s.desc, { w: W, fontSize: 14 });
    const kwRows = s.keywords?.length ? (longest(s.keywords.join("  "), { fontSize: 13, bold: true }) + s.keywords.length * 0.58 > W ? 2 : 1) : 0;
    const total = 0.5 + 0.3 + tH + (s.en ? 0.45 : 0) + 0.35 + (kwRows ? kwRows * 0.56 + 0.25 : 0) + dH;
    let y = Math.max(1.1, 3.75 - total / 2);
    const label = s._part || `PART ${no}`;
    deco(slide, "pill.png", X, y, 2.2, 0.5, "胶囊装饰static");
    text(slide, label, { x: X, y, w: 2.2, h: 0.5, fontSize: 15, bold: true, charSpacing: 2, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
    y += 0.8;
    head(slide, evenBreak(s.title, { w: W, fontSize: tSize, bold: true }), { x: X, y, w: W, h: tH, fontSize: tSize, color: COLOR.white });
    y += tH + 0.05;
    if (s.en) { text(slide, s.en.toUpperCase(), { x: X, y, w: W, h: 0.4, fontSize: oneLine(s.en.toUpperCase(), { w: W, max: 15, min: 11, bold: true, charSpacing: 1 }), bold: true, charSpacing: 1, color: COLOR.aqua, valign: "middle", noBalance: true }); y += 0.45; }
    deco(slide, "glow_thin.png", X - 0.3, y + 0.05, W + 0.3, 0.12, "光线装饰static");
    y += 0.35;
    if (kwRows) y = keywordTags(slide, s.keywords, X, y, W) + 0.25;
    if (s.desc) text(slide, s.desc, { x: X, y, w: W, h: dH, fontSize: 14, color: COLOR.mist });
  }
}

/* ---------- 3 key points ---------- */
async function points3(s) {
  const layout = ctx.pickLayout(s, ["imageCards", "tagList"]);
  const slide = add(s);
  const y0 = top(slide, s);
  if (layout === "imageCards") {
    const bottom = s.conclusion ? 6.38 : 6.75;
    const ch = bottom - y0, cw = ch * 0.64, gap = Math.min(0.75, (11.4 - 3 * cw) / 2);
    const x0 = 6.667 - (3 * cw + 2 * gap) / 2;
    const iw = cw * 0.8;
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: iw, max: 20, min: 14, bold: true })));
    const bSize = Math.min(...s.items.map((it) => FIT(it.body, { w: iw, h: ch * 0.27, max: 13, min: 11, bold: false, lineSpacingMultiple: 1.25 })));
    for (let i = 0; i < 3; i++) {
      const it = s.items[i], x = x0 + i * (cw + gap);
      const fbs = ["photo_car_fire.jpg", "photo_car_tech.jpg", "photo_city.jpg"];
      await framed(slide, s, i, x, y0, cw, ch, { frame: "frame_card.png", mask: "frame_card_mask", fallback: fbs[i] });
      head(slide, it.head, { x: x + (cw - iw) / 2, y: y0 + ch * 0.065, w: iw, h: ch * 0.13, fontSize: hSize, color: COLOR.gold, align: "center" });
      text(slide, it.body, { x: x + (cw - iw) / 2, y: y0 + ch * 0.255, w: iw, h: ch * 0.27, fontSize: bSize, color: COLOR.text });
    }
    if (s.conclusion) text(slide, s.conclusion, { x: 1.2, y: 6.5, w: 10.93, h: 0.45, fontSize: oneLine(s.conclusion, { w: 10.93, max: 16, min: 12, bold: true }), bold: true, color: COLOR.gold, align: "center", valign: "middle", noBalance: true });
  } else { // tagList
    const iw = 5.55, ih = iw / 1.506;
    await framed(slide, s, 0, 0.8, y0, iw, ih, { frame: "panel9.png", mask: "panel9_mask", fallback: "photo_driver.jpg" });
    if (s.conclusion) {
      const ch = H(s.conclusion, { w: iw - 0.3, fontSize: 15, bold: true });
      text(slide, s.conclusion, { x: 1.1, y: y0 + ih + 0.2, w: iw - 0.3, h: ch, fontSize: 15, bold: true, color: COLOR.gold, fontFace: FONT.head });
    }
    const X = 6.95, W = 5.5, avail = 6.75 - y0;
    const bodyH = s.items.map((it) => H(it.body, { w: W, fontSize: 12.5 }));
    const need = s.items.length * (0.66 + 0.1) + bodyH.reduce((a, b) => a + b, 0);
    const gap = clamp((avail - need) / 3, 0.12, 0.4);
    let y = y0 + Math.max(0, (avail - need - gap * 2) / 2) * 0.3;
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: 2.25, max: 17, min: 12, bold: true })));
    s.items.forEach((it, i) => {
      deco(slide, "tag_label.png", X, y, 3.0, 0.66, "标签框装饰static");
      head(slide, it.head, { x: X + 0.62, y, w: 2.25, h: 0.66, fontSize: hSize, color: COLOR.gold });
      text(slide, it.body, { x: X + 0.05, y: y + 0.76, w: W, h: bodyH[i], fontSize: 12.5, color: COLOR.text });
      y += 0.76 + bodyH[i] + gap;
    });
  }
}

/* ---------- 4 key points ---------- */
async function points4(s) {
  const layout = ctx.pickLayout(s, ["columns", "grid2x2"]);
  const slide = add(s);
  const y0 = top(slide, s);
  const icons = ["search", "cpu", "layers", "trending-up"];
  if (layout === "columns") {
    const bottom = s.conclusion ? 6.38 : 6.75;
    const cw = 2.62, gap = 0.27, x0 = 6.667 - (4 * cw + 3 * gap) / 2;
    const bodyMax = Math.max(...s.items.map((it) => H(it.body, { w: cw - 0.6, fontSize: 13 })));
    const ch = Math.min(bottom - y0, Math.max(3.3, 1.75 + bodyMax + 1.1));
    const yc = y0 + (bottom - y0 - ch) * 0.4;
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw - 0.6, max: 21, min: 15, bold: true })));
    for (let i = 0; i < 4; i++) {
      const it = s.items[i], x = x0 + i * (cw + gap), y0 = yc;
      deco(slide, "col_card.png", x, y0, cw, ch, "卡片底装饰static");
      slide.addShape(ctx.shapes.RECTANGLE, { x, y: y0, w: cw, h: 0.04, fill: { color: COLOR.blue }, line: { type: "none" }, objectName: "线条装饰static" });
      await iconImg(slide, it.icon || icons[i], COLOR.cyan, x + 0.3, y0 + 0.32, 0.46, icons[i]);
      text(slide, num2(i), { x: x + cw - 1.15, y: y0 + 0.26, w: 0.85, h: 0.55, fontSize: 24, bold: true, color: "6FA8FF", align: "right", valign: "middle", noBalance: true, fontFace: FONT.head });
      deco(slide, "glow_line.png", x - 0.2, y0 + ch - 0.32, cw + 0.4, 0.4, "光线装饰static");
      head(slide, it.head, { x: x + 0.3, y: y0 + 0.98, w: cw - 0.6, h: 0.5, fontSize: hSize, color: COLOR.gold });
      deco(slide, "glow_thin.png", x + 0.1, y0 + 1.52, cw - 0.2, 0.1, "光线装饰static");
      text(slide, it.body, { x: x + 0.3, y: y0 + 1.75, w: cw - 0.6, h: Math.min(ch - 1.95, H(it.body, { w: cw - 0.6, fontSize: 13 }) + 0.1), fontSize: 13, color: COLOR.text });
    }
    if (s.conclusion) text(slide, s.conclusion, { x: 1.2, y: 6.5, w: 10.93, h: 0.45, fontSize: oneLine(s.conclusion, { w: 10.93, max: 16, min: 12, bold: true }), bold: true, color: COLOR.gold, align: "center", valign: "middle", noBalance: true });
  } else { // grid2x2
    const iw = 5.4, ih = iw / 1.551;
    await framed(slide, s, 0, 0.75, y0, iw, ih, { frame: "photo_frame.png", mask: "photo_mask", fallback: "photo_driver2.jpg" });
    if (s.conclusion) {
      const ch = H(s.conclusion, { w: iw - 0.4, fontSize: 15, bold: true });
      text(slide, s.conclusion, { x: 1.05, y: Math.min(y0 + ih + 0.2, 6.85 - ch), w: iw - 0.4, h: ch, fontSize: 15, bold: true, color: COLOR.gold, fontFace: FONT.head });
    }
    const X = 6.5, W = 5.98, gap = 0.2, bw = (W - gap) / 2, bh = (6.75 - y0 - gap) / 2;
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: bw - 0.95, max: 18, min: 13, bold: true })));
    for (let i = 0; i < 4; i++) {
      const it = s.items[i], x = X + (i % 2) * (bw + gap), y = y0 + Math.floor(i / 2) * (bh + gap);
      hudBox(slide, x, y, bw, bh);
      await iconImg(slide, it.icon || icons[i], COLOR.cyan, x + 0.28, y + 0.3, 0.42, icons[i]);
      head(slide, it.head, { x: x + 0.82, y: y + 0.24, w: bw - 0.95, h: 0.54, fontSize: hSize, color: COLOR.gold });
      text(slide, it.body, { x: x + 0.28, y: y + 0.92, w: bw - 0.5, h: Math.min(bh - 1.05, H(it.body, { w: bw - 0.5, fontSize: 12.5 }) + 0.05), fontSize: 12.5, color: COLOR.text });
    }
  }
}

/* ---------- Comparison ---------- */
async function compare(s) {
  const layout = ctx.pickLayout(s, ["panels", "triad"]);
  const slide = add(s);
  const L = s.left || {}, R = s.right || {};
  if (layout === "panels") {
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 5.95 : 6.7, pw = 5.4;
    const nMax = Math.max((L.items || []).length, (R.items || []).length, 1);
    const ph = Math.min(bottom - y0, 1.35 + nMax * 0.62 + 0.4);
    const py = y0 + (bottom - y0 - ph) * 0.4;
    const panel = async (x, g, def) => {
      const y0 = py;
      hudBox(slide, x, y0, pw, ph);
      deco(slide, "tag_label.png", x + 0.35, y0 + 0.32, 3.2, 0.7, "标签框装饰static");
      head(slide, g.head, { x: x + 1.0, y: y0 + 0.32, w: 2.4, h: 0.7, fontSize: oneLine(g.head, { w: 2.4, max: 20, min: 14, bold: true }), color: COLOR.gold });
      await iconImg(slide, g.icon || def, COLOR.cyan, x + pw - 0.95, y0 + 0.4, 0.52, def);
      const items = g.items || [];
      const fs = items.length > 3 ? 15 : 16;
      const step = Math.min(0.62, (ph - 1.45) / Math.max(items.length, 1));
      items.forEach((t, i) => {
        const y = y0 + 1.35 + i * step;
        diamond(slide, x + 0.5, y + step / 2 - 0.065);
        text(slide, t, { x: x + 0.82, y, w: pw - 1.2, h: step, fontSize: fs, color: COLOR.text, valign: "middle", noBalance: true });
      });
    };
    await panel(0.85, L, "x-circle");
    await panel(13.333 - 0.85 - pw, R, "check-circle");
    const cy = py + ph / 2;
    deco(slide, "ring_glow.png", 6.667 - 1.75, cy - 1.75, 3.5, 3.5, "光环装饰static");
    slide.addShape(ctx.shapes.OVAL, { x: 6.667 - 0.4, y: cy - 0.4, w: 0.8, h: 0.8, fill: { color: COLOR.blue }, line: { color: COLOR.cyan, width: 1.5 }, objectName: "VS" });
    text(slide, "VS", { x: 6.667 - 0.4, y: cy - 0.4, w: 0.8, h: 0.8, fontSize: 18, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
    if (s.conclusion) text(slide, s.conclusion, { x: 1.2, y: 6.15, w: 10.93, h: 0.5, fontSize: oneLine(s.conclusion, { w: 10.93, max: 17, min: 12, bold: true }), bold: true, color: COLOR.gold, align: "center", valign: "middle", noBalance: true });
  } else { // triad
    const y0 = top(slide, s);
    const nMax = Math.max((L.items || []).length, (R.items || []).length, 2);
    const ch = clamp(1.25 + nMax * 0.78 + 0.45, 3.9, 6.75 - y0), cw = Math.min(ch * 0.618, 3.0);
    const fy = y0 + (6.75 - y0 - ch) * 0.3;
    const frame = (x, g) => {
      const y0 = fy;
      deco(slide, "frame_tall.png", x, y0, cw, ch, "科幻框装饰static");
      const iw = cw - 0.6;
      head(slide, g.head, { x: x + 0.3, y: y0 + 0.35, w: iw, h: 0.55, fontSize: oneLine(g.head, { w: iw, max: 21, min: 14, bold: true }), color: COLOR.gold, align: "center" });
      deco(slide, "glow_thin.png", x + 0.15, y0 + 0.95, cw - 0.3, 0.1, "光线装饰static");
      const items = g.items || [];
      const size = Math.min(...items.map((t) => FIT(t, { w: iw - 0.25, h: 0.62, max: 14, min: 11, bold: false, lineSpacingMultiple: 1.2 })));
      const hs = items.map((t) => H(t, { w: iw - 0.25, fontSize: size, lineSpacingMultiple: 1.2 }));
      const step = Math.max(...hs) + 0.18;
      let y = y0 + 1.25;
      items.forEach((t, i) => {
        diamond(slide, x + 0.33, y + 0.1, 0.11);
        text(slide, t, { x: x + 0.55, y, w: iw - 0.25, h: hs[i], fontSize: size, color: COLOR.text, lineSpacingMultiple: 1.2 });
        y += step;
      });
    };
    frame(0.85, L);
    frame(13.333 - 0.85 - cw, R);
    const cy = fy + Math.min(1.75, ch / 2 - 0.35);
    await roundPic(slide, s, 0, 6.667, cy, 2.9, "photo_car_tech.jpg");
    text(slide, "VS", { x: 6.667 - 0.5, y: cy + 1.62, w: 1.0, h: 0.45, fontSize: 18, bold: true, color: COLOR.cyan, align: "center", valign: "middle", noBalance: true });
    if (s.conclusion) {
      const w = 13.333 - 2 * (0.85 + cw) - 0.5;
      const h = H(s.conclusion, { w, fontSize: 14, bold: true });
      text(slide, s.conclusion, { x: 6.667 - w / 2, y: cy + 2.15, w, h, fontSize: 14, bold: true, color: COLOR.gold, align: "center" });
    }
  }
}

/* ---------- Data ---------- */
const UNIT = { "亿": 1e8, "万": 1e4, "千": 1e3, "百": 1e2, "k": 1e3, "K": 1e3, "M": 1e6, "B": 1e9 };
function parseValue(v) {
  const m = String(v).replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*(亿|万|千|百|[kKMB])?/);
  return m ? { n: parseFloat(m[1]), mul: UNIT[m[2]] || 1 } : null;
}
function chartData(s) {
  if (s.chart?.values?.length) return { labels: s.chart.labels || s.items.map((i) => i.label), values: s.chart.values };
  const parsed = s.items.map((i) => parseValue(i.value));
  if (parsed.some((p) => !p)) return null;
  const suffix = (v) => String(v).replace(/[\d.,\s-]/g, "");
  if (new Set(s.items.map((i) => suffix(i.value))).size > 1) return null;
  const abs = parsed.map((p) => p.n * p.mul), big = Math.max(...abs);
  const unit = big >= 1e8 ? 1e8 : big >= 1e4 ? 1e4 : 1;
  return { labels: s.items.map((i) => i.label), values: abs.map((v) => Math.round((v / unit) * 100) / 100) };
}
function sourceLine(slide, s, x, y, w) {
  const src = "数据来源：" + s.source;
  text(slide, src, { x, y, w, h: H(src, { w, fontSize: 9 }), fontSize: 9, color: COLOR.mist, noBalance: true });
}
async function stats(s) {
  const data = chartData(s);
  const layout = ctx.pickLayout(s, s.chart && data ? ["chart", "badges"] : data ? ["badges", "chart"] : ["badges"]);
  const slide = add(s);
  const y0 = top(slide, s);
  if (layout === "badges") {
    const iw = 5.5, ih = iw / 1.506;
    await framed(slide, s, 0, 0.8, y0, iw, ih, { frame: "panel9.png", mask: "panel9_mask", fallback: "photo_car_tech.jpg" });
    const X = 6.85, W = 5.6, n = s.items.length;
    const avail = Math.max(ih, 6.3 - y0), gap = 0.2, rh = Math.min(1.15, (avail - (n - 1) * gap) / n);
    const vSize = Math.min(...s.items.map((it) => FIT(it.value, { w: 2.2, h: rh - 0.2, max: 34, min: 20 })));
    s.items.forEach((it, i) => {
      const y = y0 + i * (rh + gap);
      hudBox(slide, X, y, W, rh, { corner: ACCENTS[i] });
      text(slide, it.value, { x: X + 0.3, y, w: 2.25, h: rh, fontSize: vSize, bold: true, color: COLOR.cyan, valign: "middle", noBalance: true, fontFace: FONT.head });
      line(slide, X + 2.65, y + 0.22, 0, rh - 0.44, COLOR.sky, 1);
      text(slide, it.label, { x: X + 2.85, y, w: W - 3.05, h: rh, fontSize: 13, color: COLOR.text, valign: "middle" });
    });
    sourceLine(slide, s, 0.85, Math.max(y0 + ih, y0 + n * (rh + gap) - gap) + 0.2, 11.6);
  } else { // chart
    const X = 0.85, W = 4.6, n = s.items.length;
    const step = n > 3 ? 0.78 : 0.9;
    let y = y0 + 0.1;
    const vSize = Math.min(...s.items.map((it) => FIT(it.value, { w: 1.95, h: 0.6, max: 26, min: 18 })));
    s.items.forEach((it, i) => {
      slide.addShape(ctx.shapes.RECTANGLE, { x: X, y: y + 0.14, w: 0.12, h: step - 0.36, fill: { color: ACCENTS[i] }, line: { type: "none" }, objectName: "色条" });
      text(slide, it.value, { x: X + 0.3, y, w: 1.95, h: step - 0.08, fontSize: vSize, bold: true, color: COLOR.white, valign: "middle", noBalance: true, fontFace: FONT.head });
      text(slide, it.label, { x: X + 2.3, y, w: W - 2.3, h: step - 0.08, fontSize: 12.5, color: COLOR.text, valign: "middle" });
      y += step;
    });
    sourceLine(slide, s, X, Math.max(y + 0.15, 6.05), W);
    const bx = 5.85, bw = 6.6, bh = 6.75 - y0;
    hudBox(slide, bx, y0, bw, bh, { tr: 45 });
    const d = data || { labels: s.items.map((i) => i.label), values: s.items.map(() => 0) };
    const max = Math.max(...d.values);
    slide.addChart(ctx.charts.BAR, [{ name: s.chart?.unit || "数值", labels: d.labels, values: d.values }], {
      x: bx + 0.3, y: y0 + 0.25, w: bw - 0.6, h: bh - 0.5, barDir: "col", barGapWidthPct: 80,
      chartColors: ACCENTS.slice(0, d.values.length),
      showTitle: !!s.chart?.title, title: s.chart?.title || "", titleColor: COLOR.white, titleFontSize: 13, titleFontFace: FONT.body,
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: COLOR.white, dataLabelFontSize: 14, dataLabelFontBold: true, dataLabelFontFace: FONT.body,
      catAxisHidden: true, valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: max > 0 ? max * 1.18 : 1,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false,
      altText: `柱状图：${d.labels.map((l, i) => `${l} ${d.values[i]}`).join("、")}`,
    });
  }
}

/* ---------- Timeline ---------- */
function curveY(x, Y0, Hc) {
  const t = CURVE.curveY, i = clamp(x / CURVE.step, 0, t.length - 1);
  const a = Math.floor(i), b = Math.min(t.length - 1, a + 1), f = i - a;
  return Y0 + (t[a] * (1 - f) + t[b] * f) * Hc;
}
async function timeline(s) {
  ctx.pickLayout(s, ["curve"]);
  const slide = add(s);
  plate(slide, s);
  heading(slide, s.title);
  if (s.lead) text(slide, s.lead, { x: 1.4, y: 1.62, w: 7.2, h: H(s.lead, { w: 7.2, fontSize: 13 }), fontSize: 13, color: COLOR.mist });
  const bottom = s.conclusion ? 6.3 : 6.85;
  const Y0 = 3.0, Hc = 2.2;
  deco(slide, "curve.png", 0, Y0, 13.333, Hc, "曲线装饰static");
  const n = s.items.length, x1 = 1.85, x2 = 11.45, sp = (x2 - x1) / (n - 1), cw = Math.min(2.5, sp - 0.15);
  const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw, max: 18, min: 13, bold: true })));
  const tSize = Math.min(...s.items.map((it) => oneLine(it.time, { w: 1.08, max: 16, min: 11, bold: true })));
  s.items.forEach((it, i) => {
    const cx = x1 + i * sp, cy = curveY(cx, Y0, Hc);
    const bw = 1.38, bh = bw / 0.88;
    deco(slide, "node_badge.png", cx - bw / 2, cy - 0.2 - bh, bw, bh, "雷达环装饰static");
    text(slide, it.time, { x: cx - 0.56, y: cy - 0.2 - bh * 0.437 - 0.25, w: 1.12, h: 0.5, fontSize: tSize, bold: true, color: COLOR.cyan, align: "center", valign: "middle", noBalance: true });
    slide.addShape(ctx.shapes.OVAL, { x: cx - 0.13, y: cy - 0.13, w: 0.26, h: 0.26, fill: { color: COLOR.cyan }, line: { color: COLOR.white, width: 1.5 }, objectName: "节点装饰static" });
    head(slide, it.head, { x: cx - cw / 2, y: cy + 0.28, w: cw, h: 0.46, fontSize: hSize, color: COLOR.gold, align: "center" });
    if (it.body) {
      const bh2 = Math.min(bottom - (cy + 0.78), H(it.body, { w: cw, fontSize: 12 }));
      text(slide, it.body, { x: cx - cw / 2, y: cy + 0.78, w: cw, h: bh2, fontSize: 12, color: COLOR.text, align: "center" });
    }
  });
  if (s.conclusion) text(slide, s.conclusion, { x: 1.2, y: 6.45, w: 10.93, h: 0.45, fontSize: oneLine(s.conclusion, { w: 10.93, max: 16, min: 12, bold: true }), bold: true, color: COLOR.gold, align: "center", valign: "middle", noBalance: true });
}

/* ---------- Large image with text ---------- */
function textColumn(slide, s, X, W, y0, yMax) {
  let size = 13;
  const need = (sz) => H(s.body, { w: W, fontSize: sz }) + (s.points || []).reduce((a, p) => a + Math.max(0.4, H(p, { w: W - 0.4, fontSize: sz })) + 0.12, 0) + (s.conclusion ? H(s.conclusion, { w: W, fontSize: 15, bold: true }) + 0.35 : 0) + 0.3;
  while (size > 11 && need(size) > yMax - y0) size -= 0.5;
  let y = y0 + Math.max(0, (yMax - y0 - need(size)) * 0.35);
  const bh = H(s.body, { w: W, fontSize: size });
  text(slide, s.body, { x: X, y, w: W, h: bh, fontSize: size, color: COLOR.text });
  y += bh + 0.3;
  for (const p of s.points || []) {
    const ph = Math.max(0.4, H(p, { w: W - 0.4, fontSize: size }));
    hudBox(slide, X, y, W, ph, { tr: 50 });
    diamond(slide, X + 0.17, y + ph / 2 - 0.06, 0.12);
    text(slide, p, { x: X + 0.42, y, w: W - 0.55, h: ph, fontSize: size, color: COLOR.white, valign: "middle" });
    y += ph + 0.12;
  }
  if (s.conclusion) {
    y += 0.23;
    const ch = H(s.conclusion, { w: W - 0.2, fontSize: 15, bold: true });
    slide.addShape(ctx.shapes.RECTANGLE, { x: X, y: y + 0.04, w: 0.06, h: ch - 0.08, fill: { color: COLOR.gold }, line: { type: "none" }, objectName: "色条" });
    text(slide, s.conclusion, { x: X + 0.2, y, w: W - 0.2, h: ch, fontSize: 15, bold: true, color: COLOR.gold, fontFace: FONT.head });
  }
}
async function imageText(s) {
  const layout = ctx.pickLayout(s, ["frameLeft", "frameRight"]);
  const slide = add(s);
  plate(slide, s);
  heading(slide, s.title);
  const iw = 6.25, ih = iw / 1.551, iy = 1.85;
  if (layout === "frameLeft") {
    await framed(slide, s, 0, 0.75, iy, iw, ih, { frame: "photo_frame.png", mask: "photo_mask", fallback: "photo_driver.jpg" });
    textColumn(slide, s, 7.45, 5.0, 1.85, 6.8);
  } else {
    await framed(slide, s, 0, 13.333 - 0.75 - iw, iy, iw, ih, { frame: "photo_frame.png", mask: "photo_mask", fallback: "photo_car_fire.jpg", flip: true });
    textColumn(slide, s, 0.95, 5.0, 1.85, 6.8);
  }
}

/* ---------- Pull quote ---------- */
async function quote(s) {
  const layout = ctx.pickLayout(s, s.image ? ["center", "portrait"] : ["center"]);
  const slide = add(s, "plain");
  if (layout === "center") {
    text(slide, "“", { x: 5.917, y: 0.75, w: 1.5, h: 1.3, fontSize: 110, color: COLOR.cyan, fontFace: "Georgia", align: "center", valign: "top", noBalance: true, objectName: "引号装饰static" });
    const size = FIT(s.text, { w: 10.4, h: 2.5, max: 40, min: 26, lineSpacingMultiple: 1.3 });
    const qt = evenBreak(s.text, { w: 10.4, fontSize: size, bold: true });
    const h = H(qt, { w: 10.4, fontSize: size, bold: true, lineSpacingMultiple: 1.3 });
    const y = Math.max(2.2, 3.75 - h / 2);
    head(slide, qt, { x: 1.467, y, w: 10.4, h, fontSize: size, color: COLOR.white, align: "center", lineSpacingMultiple: 1.3 });
    deco(slide, "glow_line.png", 2.67, y + h + 0.05, 8.0, 0.55, "光线装饰static");
    if (s.author) text(slide, "—— " + s.author, { x: 3.67, y: y + h + 0.65, w: 6, h: 0.4, fontSize: 16, color: COLOR.aqua, align: "center", valign: "middle", noBalance: true });
    deco(slide, "deco9.png", 6.667 - 3.2, 6.45, 6.4, 0.47, "装饰static");
  } else { // portrait
    await roundPic(slide, s, 0, 3.5, 3.75, 3.9, "photo_driver2.jpg");
    const X = 6.5, W = 5.9;
    text(slide, "“", { x: X - 0.1, y: 1.0, w: 1.4, h: 1.2, fontSize: 96, color: COLOR.cyan, fontFace: "Georgia", valign: "top", noBalance: true, objectName: "引号装饰static" });
    const size = FIT(s.text, { w: W, h: 2.9, max: 34, min: 24, lineSpacingMultiple: 1.3 });
    const qt = evenBreak(s.text, { w: W, fontSize: size, bold: true });
    const h = H(qt, { w: W, fontSize: size, bold: true, lineSpacingMultiple: 1.3 });
    const y = Math.max(2.15, 3.75 - h / 2);
    head(slide, qt, { x: X, y, w: W, h, fontSize: size, color: COLOR.white, lineSpacingMultiple: 1.3 });
    if (s.author) {
      line(slide, X, y + h + 0.5, 0.55, 0, COLOR.aqua, 2);
      text(slide, s.author, { x: X + 0.75, y: y + h + 0.3, w: W - 0.75, h: 0.4, fontSize: 16, color: COLOR.aqua, valign: "middle", noBalance: true });
    }
  }
}

/* ---------- Closing ---------- */
async function closing(s) {
  ctx.pickLayout(s, ["swoosh"]);
  const slide = add(s, "plain");
  deco(slide, "swoosh.png", 13.333 - 6.39, 0, 6.39, 7.5, "弧形装饰static");
  await roundPic(slide, s, 0, 9.95, 3.75, 3.7, "photo_car_tech.jpg");
  const X = 0.95, W = 6.3;
  const tSize = FIT(s.title, { w: W, h: 2.3, max: 60, min: 38 });
  const title = evenBreak(s.title, { w: W, fontSize: tSize, bold: true });
  const tH = H(title, { w: W, fontSize: tSize, bold: true, lineSpacingMultiple: 1.1 });
  const bH = H(s.body, { w: W - 0.2, fontSize: 14 });
  const tag = s.tag || "THANK YOU";
  const total = tH + 0.45 + (bH ? bH + 0.45 : 0) + 0.5;
  let y = Math.max(1.0, 3.75 - total / 2);
  head(slide, title, { x: X, y, w: W, h: tH, fontSize: tSize, color: COLOR.white, shadow: { type: "outer", color: COLOR.aqua, blur: 8, offset: 0, angle: 90, opacity: 0.45 } });
  y += tH + 0.1;
  deco(slide, "glow_thin.png", X - 0.3, y + 0.05, W, 0.12, "光线装饰static");
  y += 0.35;
  if (s.body) { text(slide, s.body, { x: X, y, w: W - 0.2, h: bH, fontSize: 14, color: COLOR.text }); y += bH + 0.45; }
  const ts = oneLine(tag, { w: 4.2, max: 16, min: 11, bold: true, charSpacing: 2 });
  const pw = clamp(longest(tag, { fontSize: ts, bold: true, charSpacing: 2 }) + 0.9, 2.4, 5.0);
  deco(slide, "pill.png", X, y, pw, 0.5, "胶囊装饰static");
  text(slide, tag, { x: X + 0.2, y, w: pw - 0.4, h: 0.5, fontSize: ts, bold: true, charSpacing: 2, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
}

/* ---------- Table (optional type) ---------- */
async function table(s) {
  ctx.pickLayout(s, ["panel"]);
  const slide = add(s);
  const y0 = top(slide, s);
  const rows = s.rows || [], cols = s.columns || [];
  const rowH = rows.length > 4 ? 0.6 : 0.68, headH = 0.55;
  const tw = 11.0, th = headH + rows.length * rowH;
  const ph = th + 0.5;
  deco(slide, "big_panel.png", 0.9, y0, 11.53, ph, "面板装饰static");
  const b = (pt, c = COLOR.sky) => ({ type: "solid", pt, color: c }), n = { type: "none" };
  const Hd = (t) => ({ text: t, options: { bold: true, fontSize: 13, color: COLOR.white, fill: { color: COLOR.blue }, border: [n, n, b(1.5, COLOR.cyan), n] } });
  const Cl = (t, j) => ({ text: t ?? "", options: { bold: j === 0, color: j === 0 ? COLOR.gold : COLOR.text, border: [n, n, b(0.75), n] } });
  const len = (t) => [...String(t ?? "")].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2000 ? 0.55 : 1), 0);
  const weight = cols.map((c, j) => Math.max(2, len(c), ...rows.map((r) => len(r[j]))));
  let colW = weight.map((w) => (tw * w) / weight.reduce((a, c) => a + c, 0));
  const short = colW.map((w) => Math.max(1.2, w)), extra = short.reduce((a, c) => a + c, 0) - tw;
  if (extra > 0) { const wide = short.map((w, j) => (colW[j] > 1.2 ? w : 0)), sum = wide.reduce((a, c) => a + c, 0); colW = short.map((w, j) => (wide[j] ? w - (extra * w) / sum : w)); }
  slide.addTable([cols.map(Hd), ...rows.map((r) => cols.map((_, j) => Cl(r[j], j)))], {
    x: 1.165, y: y0 + 0.25, w: tw, colW, rowH: [headH, ...rows.map(() => rowH)],
    fontSize: 12, color: COLOR.text, fontFace: FONT.body, margin: [0.04, 0.12, 0.04, 0.12], valign: "middle",
  });
  if (s.conclusion) {
    const y = y0 + ph + 0.2;
    const h = H(s.conclusion, { w: 10.5, fontSize: 15, bold: true });
    slide.addShape(ctx.shapes.RECTANGLE, { x: 1.165, y: y + 0.04, w: 0.06, h: h - 0.08, fill: { color: COLOR.gold }, line: { type: "none" }, objectName: "色条" });
    text(slide, s.conclusion, { x: 1.4, y, w: 10.5, h, fontSize: 15, bold: true, color: COLOR.gold, fontFace: FONT.head });
  }
}

/* ---------- Steps (optional type) ---------- */
async function steps(s) {
  ctx.pickLayout(s, ["platforms"]);
  const slide = add(s);
  const y0 = top(slide, s, { minTop: 1.85 });
  const n = s.items.length, X = 0.95, W = 11.43, gap = 0.45, cw = (W - (n - 1) * gap) / n;
  const pw = Math.min(1.55, cw * 0.62), ph = pw / 0.915;
  const boxH = Math.min(2.65, 6.85 - y0 - ph - 0.15);
  const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw - 0.5, max: 19, min: 13, bold: true })));
  const bSize = Math.min(...s.items.map((it) => FIT(it.body, { w: cw - 0.5, h: boxH - 1.25, max: 13, min: 11, bold: false, lineSpacingMultiple: 1.25 })));
  for (let i = 0; i < n; i++) {
    const it = s.items[i], x = X + i * (cw + gap);
    hudBox(slide, x, y0, cw, boxH);
    text(slide, `STEP ${num2(i)}`, { x: x + 0.25, y: y0 + 0.22, w: cw - 0.5, h: 0.3, fontSize: 12, bold: true, charSpacing: 2, color: COLOR.cyan, valign: "middle", noBalance: true });
    head(slide, it.head, { x: x + 0.25, y: y0 + 0.55, w: cw - 0.5, h: 0.5, fontSize: hSize, color: COLOR.gold });
    text(slide, it.body, { x: x + 0.25, y: y0 + 1.12, w: cw - 0.5, h: boxH - 1.25, fontSize: bSize, color: COLOR.text });
    const px = x + (cw - pw) / 2, py = y0 + boxH + 0.12;
    deco(slide, "num_badge19.png", px, py, pw, ph, "底座装饰static");
    text(slide, num2(i), { x: px, y: py + ph * 0.18, w: pw, h: ph * 0.34, fontSize: 26, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true, fontFace: FONT.head });
    if (i < n - 1) await iconImg(slide, "chevrons-right", COLOR.cyan, x + cw + (gap - 0.32) / 2, y0 + boxH / 2 - 0.16, 0.32);
  }
}

/* ============================ Entry point ============================ */
async function render(deck, c) {
  ctx = c;
  MASKS = JSON.parse(fs.readFileSync(ctx.asset("masks.json"), "utf8"));
  CURVE = JSON.parse(fs.readFileSync(ctx.asset("curve.json"), "utf8"));
  ctx.pres.defineSlideMaster({ title: "HUD_CONTENT", background: { path: ctx.asset("bg_content.jpg") }, objects: [] });
  ctx.pres.defineSlideMaster({ title: "HUD_PLAIN", background: { path: ctx.asset("bg_plain.jpg") }, objects: [] });
  ctx.pres.defineSlideMaster({ title: "HUD_COVER", background: { path: ctx.asset("bg_cover.jpg") }, objects: [] });
  await ctx.renderAll({ cover, toc, section, points3, points4, compare, stats, timeline, imageText, quote, closing, table, steps });
}

module.exports = { render };
