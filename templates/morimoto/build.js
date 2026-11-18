/**
 * Template: MORIMOTO Mist Purple Magazine (morimoto)
 * ------------------------------------------------------------------
 * Exports render(deck, ctx): one function per page type; types with several layouts choose via ctx.pickLayout
 * Coordinates are in inches, canvas 13.333 × 7.5. Design tokens match the original template; text on light-lilac backgrounds uses the dark ink color (the original template's white text had too little contrast)
 *
 * Layout list (keep in sync with meta.json → layouts):
 *   cover     magazine                          rounded image on the left + large title on the right
 *   toc       panel                             light-lilac panel on the left + numbered items on the right (3–8, two columns when more than 4) + bottom wide image
 *   section   fullbleed                         full-bleed background image + centered color panel
 *   points3   imageStack | iconRow              two stacked images + three sub-headed sections / wide banner + three icon points
 *   points4   colorCards | numbered | grid2x2   four color cards / light-lilac panel + four numbered items / 2×2 color blocks
 *   compare   panels | banner                   two side-by-side panels + VS / wide banner + A/B panel on the right
 *   stats     numbers | chart                   big numbers + large image / big numbers + bar chart (needs numeric values)
 *   timeline  cards                             3–5 rounded cards, last one highlighted
 *   imageText rightImage | leftImage            text with a tall image on the right / tall image on the left with leaf shadow
 *   quote     portrait | center                 tall image + quote / centered quote (used when there is no image)
 *   closing   portrait                          tall portrait + closing words + THANK YOU
 *   table     panel        (optional type)      title + square image on the left, table on a light-lilac panel on the right
 *   steps     imageSteps   (optional type)      tall image on the left + STEP 01~04 on the right
 */
const COLOR = {
  bg: "7B7584", lilac: "CEC3CE", amber: "BD802F", terracotta: "C75431",
  ochre: "B17F1B", gold: "C58D1E", yellow: "FFC000", charcoal: "3F3D42",
  white: "FFFFFF", ink: "3B3644", screen: "2B2930",
};
const FONT = { head: "思源黑体 CN Light", body: "等线" };
const CARD = [COLOR.terracotta, COLOR.ochre, COLOR.amber, COLOR.charcoal];
const MASTER = "MIST_BASE";

/* ---------------- Typesetting components ---------------- */
let ctx; // set at the start of render
function text(slide, str, o) {
  if (str === undefined || str === null || str === "") return 0;
  const opt = { isTextBox: true, margin: 0, color: COLOR.white, fontFace: FONT.body, fontSize: 12, valign: "top", lineSpacingMultiple: 1.25, ...o };
  const s = o.noBalance ? String(str) : ctx.balance(String(str), { w: opt.w, fontSize: opt.fontSize, bold: opt.bold, charSpacing: opt.charSpacing, lineSpacingMultiple: opt.lineSpacingMultiple });
  delete opt.noBalance;
  slide.addText(s, opt);
  return opt.h;
}
const head = (slide, str, o) => text(slide, str, { fontFace: FONT.head, valign: "middle", lineSpacingMultiple: 1.1, ...o });
/** Small label: single line, shrinks automatically when it doesn't fit (10.5 → 8pt) */
function eyebrow(slide, str, o) {
  if (!str) return 0;
  const cs = o.charSpacing ?? 3;
  const size = ctx.fitLine(str, { w: o.w, max: o.fontSize || 10.5, min: 8, bold: true, charSpacing: cs });
  return text(slide, str, { bold: true, h: 0.28, valign: "middle", noBalance: true, ...o, fontSize: size, charSpacing: cs });
}
/** Single-line label (tags, bars): shrinks automatically to fit within w */
const oneLine = (str, o) => ctx.fitLine(String(str || ""), o);
/** Height text needs (inches) */
const H = (str, o) => (str ? ctx.measure(String(str), { lineSpacingMultiple: 1.25, ...o }).needH + 0.04 : 0);
/** Choose a font size: the largest that fits within w × h */
const FIT = (str, o) => ctx.fit(String(str || ""), { lineSpacingMultiple: 1.1, ...o });

function rect(slide, x, y, w, h, color, o = {}) {
  slide.addShape(ctx.shapes.RECTANGLE, { x, y, w, h, fill: { color, transparency: o.transparency || 0 }, line: { type: "none" }, objectName: o.name });
}
function rrect(slide, x, y, w, h, o = {}) {
  slide.addShape(ctx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: o.r ?? 0.3,
    fill: o.fill ? { color: o.fill, transparency: o.transparency || 0 } : { type: "none" },
    line: o.line ? { color: o.line, width: o.lineW || 1 } : { type: "none" },
  });
}
const hline = (slide, x, y, w, color = COLOR.white, width = 2) => slide.addShape(ctx.shapes.LINE, { x, y, w, h: 0, line: { color, width } });
async function leaf(slide, side = "R", x) {
  const p = await ctx.prep("image2.png", 8.04, 7.5, { alpha: 0.41, flip: side === "L", crop: false });
  slide.addImage({ path: p, x: x ?? (side === "R" ? 5.3 : 0), y: 0, w: 8.04, h: 7.5, objectName: "叶影装饰" });
}
async function iconImg(slide, name, color, x, y, s, def) {
  slide.addImage({ data: await ctx.icon(name, color, def), x, y, w: s, h: s, objectName: "图标static" });
}
async function iconCircle(slide, name, color, x, y, d, def, bg = COLOR.white) {
  slide.addShape(ctx.shapes.OVAL, { x, y, w: d, h: d, fill: { color: bg }, line: { type: "none" } });
  const s = d * 0.5;
  await iconImg(slide, name, color, x + (d - s) / 2, y + (d - s) / 2, s, def);
}
/** Default eyebrow: "01 · section English name"; s.eyebrow === "" means don't show it */
function eb(s) {
  if (s.eyebrow !== undefined) return s.eyebrow;
  if (!s._sectionNo) return "";
  return `${s._num} · ${s._en ? s._en.toUpperCase() : s._sectionTitle}`;
}
const add = (s, bg = COLOR.bg) => ctx.addSlide(s, { master: MASTER, bg });
const pic = (slide, s, idx, x, y, w, h, opt = {}) => ctx.pic(slide, s, idx, x, y, w, h, opt);
const num2 = (i) => String(i + 1).padStart(2, "0");

/* ============================ Page types ============================ */

async function cover(s) {
  ctx.pickLayout(s, ["magazine"]);
  const slide = add(s);
  await leaf(slide, "R");
  await pic(slide, s, 0, 0.8, 1.73, 6.01, 4.68, { radius: 0.78, fallback: "image1.jpeg" });
  const X = 7.27, Wd = 5.6;
  const tSize = FIT(s.title, { w: Wd, h: 1.9, max: 54, min: 32 });
  const tH = H(s.title, { w: Wd, fontSize: tSize, lineSpacingMultiple: 1.1 });
  const stSize = s.subtitle ? FIT(s.subtitle, { w: Wd, h: 0.9, max: 22, min: 16 }) : 0;
  const stH = s.subtitle ? H(s.subtitle, { w: Wd, fontSize: stSize, lineSpacingMultiple: 1.1 }) : 0;
  const dH = H(s.desc, { w: 5.0, fontSize: 12 });
  const total = tH + (stH ? stH + 0.15 : 0) + (dH ? dH + 0.25 : 0) + (s.tag ? 0.74 + 0.35 : 0);
  let y = Math.max(0.9, 4.07 - total / 2);
  head(slide, s.title, { x: X, y, w: Wd, h: tH, fontSize: tSize });
  y += tH + 0.15;
  if (s.subtitle) { head(slide, s.subtitle, { x: X, y, w: Wd + 0.2, h: stH, fontSize: stSize }); y += stH + 0.25; }
  if (s.desc) { text(slide, s.desc, { x: X + 0.02, y, w: 5.0, h: dH, fontSize: 12 }); y += dH + 0.35; }
  if (s.tag) {
    rect(slide, X, y, 4.12, 0.74, COLOR.lilac);
    text(slide, s.tag, { x: X + 0.23, y, w: 3.75, h: 0.74, fontSize: oneLine(s.tag, { w: 3.75, max: 14, min: 9, bold: true, charSpacing: 4 }), bold: true, charSpacing: 4, color: COLOR.ink, valign: "middle", noBalance: true });
  }
}

async function toc(s) {
  ctx.pickLayout(s, ["panel"]);
  const slide = add(s);
  rect(slide, 0, 1.54, 6.67, 5.96, COLOR.lilac, { transparency: 15 });
  await leaf(slide, "R");
  head(slide, s.title || "目录", { x: 1.06, y: 2.25, w: 4.6, h: 0.85, fontSize: 44, color: COLOR.ink });
  eyebrow(slide, "CONTENTS", { x: 1.08, y: 3.15, w: 3, color: COLOR.ink });
  text(slide, s.desc, { x: 1.06, y: 5.35, w: 4.9, h: 1.0, fontSize: 12, color: COLOR.ink });
  const items = s.items || [];
  const cols = items.length > 4 ? 2 : 1;
  const perCol = Math.ceil(items.length / cols);
  const step = Math.min(0.88, 3.55 / Math.max(perCol - 1, 1));
  const tw = cols === 2 ? 2.25 : 4.9;
  items.forEach((it, i) => {
    const col = Math.floor(i / perCol), row = i % perCol;
    const x = cols === 2 ? [7.3, 10.25][col] : 7.6, y = 1.25 + row * step + (cols === 1 ? 0.2 : 0);
    slide.addShape(ctx.shapes.OVAL, { x, y, w: 0.52, h: 0.52, fill: { color: CARD[i % 4] }, line: { type: "none" } });
    text(slide, num2(i), { x, y, w: 0.52, h: 0.52, fontSize: 13, bold: true, align: "center", valign: "middle", noBalance: true });
    head(slide, it.head, { x: x + 0.66, y: it.sub ? y - 0.04 : y + 0.08, w: tw, h: 0.34, fontSize: 14 });
    text(slide, it.sub, { x: x + 0.66, y: y + 0.3, w: tw, h: 0.26, fontSize: 10 });
  });
  await pic(slide, s, 0, 7.69, 5.18, 5.64, 2.32, { fallback: "image14.jpeg" });
}

async function section(s) {
  ctx.pickLayout(s, ["fullbleed"]);
  const slide = add(s, "image");
  slide.background = { path: await ctx.image(s, 0, 13.333, 7.5, { fallback: "image17.jpeg" }) };
  rect(slide, 1.29, 1.27, 10.76, 4.96, COLOR.bg);
  const tSize = FIT(s.title, { w: 9.15, h: 1.1, max: 48, min: 34 });
  head(slide, s.title, { x: 2.1, y: 1.6, w: 9.15, h: 1.1, fontSize: tSize, align: "center" });
  const label = s._part + (s.en ? " · " + s.en.toUpperCase() : "");
  const lSize = oneLine(label, { w: 6.6, max: 15, min: 10, bold: true, charSpacing: 3 });
  const lw = Math.min(7.0, Math.max(3.0, ctx.measure(label, { w: 20, fontSize: lSize, bold: true, charSpacing: 3 }).longest + 0.4));
  text(slide, label, { x: 6.667 - lw / 2, y: 2.83, w: lw, h: 0.47, fontSize: lSize, bold: true, charSpacing: 3, align: "center", valign: "middle", noBalance: true });
  const gapIn = 6.667 - lw / 2 - 0.2, L = Math.min(2.2, gapIn - 2.0);
  if (L > 0.4) { hline(slide, gapIn - L, 3.06, L); hline(slide, 13.333 - gapIn, 3.06, L); }
  let y = 3.75;
  if (s.keywords?.length) {
    const kw = s.keywords.join(" · ");
    const kSize = oneLine(kw, { w: 8.4, max: 14, min: 11, bold: true, charSpacing: 2 });
    const kwW = Math.min(9.0, Math.max(3.2, ctx.measure(kw, { w: 20, fontSize: kSize, bold: true, charSpacing: 2 }).longest + 0.8));
    slide.addShape(ctx.shapes.RECTANGLE, { x: 6.667 - kwW / 2, y, w: kwW, h: 0.5, fill: { type: "none" }, line: { color: COLOR.white, width: 2 } });
    text(slide, kw, { x: 6.667 - kwW / 2, y, w: kwW, h: 0.5, fontSize: kSize, bold: true, charSpacing: 2, align: "center", valign: "middle", noBalance: true });
    y = 4.65;
  }
  text(slide, s.desc, { x: 2.56, y, w: 8.22, h: 0.95, fontSize: 14, align: "center" });
}

/* ---------- 3 key points ---------- */
async function points3(s) {
  const layout = ctx.pickLayout(s, ["imageStack", "iconRow"]);
  const slide = add(s);
  const icons = ["target", "layers", "zap"];
  if (layout === "imageStack") {
    await pic(slide, s, 1, 1.25, 3.4, 2.59, 3.15, { fallback: "image22.jpeg" });
    await pic(slide, s, 0, 3.18, 1.36, 3.22, 4.49, { fallback: "image23.jpeg" });
    const X = 7.5, Wd = 5.2;
    eyebrow(slide, eb(s), { x: X, y: 0.95, w: Wd });
    const tSize = FIT(s.title, { w: Wd, h: 0.65, max: 28, min: 22 });
    head(slide, s.title, { x: X, y: 1.25, w: Wd, h: 0.65, fontSize: tSize });
    let y = 2.0;
    if (s.lead) { const h = H(s.lead, { w: Wd, fontSize: 12 }); text(slide, s.lead, { x: X, y, w: Wd, h, fontSize: 12 }); y += h + 0.3; } else y += 0.15;
    for (const it of s.items) {
      text(slide, it.head, { x: X, y, w: Wd, h: 0.3, fontSize: 13, bold: true, charSpacing: 1, valign: "middle", noBalance: true });
      const bh = Math.max(0.3, H(it.body, { w: Wd, fontSize: 11 }));
      text(slide, it.body, { x: X, y: y + 0.36, w: Wd, h: bh, fontSize: 11 });
      y += 0.36 + bh + 0.3;
    }
    if (s.conclusion) {
      const h = H(s.conclusion, { w: Wd, fontSize: 15, lineSpacingMultiple: 1.2 });
      rect(slide, X, y + 0.05, 0.06, h - 0.06, COLOR.amber);
      text(slide, s.conclusion, { x: X + 0.22, y, w: Wd - 0.22, h, fontSize: 15, fontFace: FONT.head, lineSpacingMultiple: 1.2 });
    }
  } else { // iconRow
    await pic(slide, s, 0, 0.9, 0, 11.6, 4.11, { fallback: "image31.jpeg" });
    rect(slide, 0.9, 3.35, 6.0, 1.05, COLOR.bg);
    eyebrow(slide, eb(s), { x: 1.4, y: 3.45, w: 5 });
    head(slide, s.title, { x: 1.4, y: 3.75, w: 5.4, h: 0.55, fontSize: FIT(s.title, { w: 5.4, h: 0.55, max: 24, min: 18 }) });
    text(slide, s.lead, { x: 7.25, y: 4.2, w: 5.25, h: 0.5, fontSize: 12, valign: "middle" });
    for (let i = 0; i < 3; i++) {
      const it = s.items[i], x = 1.4 + i * 3.75;
      await iconImg(slide, it.icon || icons[i], COLOR.yellow, x, 4.85, 0.34, icons[i]);
      head(slide, it.head, { x, y: 5.27, w: 3.3, h: 0.4, fontSize: 16 });
      text(slide, it.body, { x, y: 5.72, w: 3.25, h: 0.62, fontSize: 11.5 });
    }
    if (s.conclusion) head(slide, s.conclusion, { x: 1.4, y: 6.5, w: 10.9, h: 0.5, fontSize: 15 });
  }
}

/* ---------- 4 key points ---------- */
async function points4(s) {
  const layout = ctx.pickLayout(s, ["colorCards", "numbered", "grid2x2"]);
  const slide = add(s);
  const icons = ["search", "pen-tool", "code", "edit-3"];
  if (layout === "colorCards") {
    eyebrow(slide, eb(s), { x: 0.92, y: 0.35, w: 11.5, align: "center" });
    head(slide, s.title, { x: 0.92, y: 0.65, w: 11.5, h: 0.6, fontSize: FIT(s.title, { w: 11.5, h: 0.6, max: 28, min: 22 }), align: "center" });
    text(slide, s.lead, { x: 1.89, y: 1.32, w: 9.56, h: 0.4, align: "center" });
    rect(slide, 6.37, 1.92, 0.6, 0.06, COLOR.white);
    const cy = s.conclusion ? 2.35 : 2.6;
    for (let i = 0; i < 4; i++) {
      const it = s.items[i], c = CARD[i], x = 1.18 + i * 2.82;
      rect(slide, x, cy, 2.53, 3.3, c);
      await iconCircle(slide, it.icon || icons[i], c, x + 0.4, cy + 0.35, 0.62, icons[i]);
      head(slide, it.head, { x: x + 0.4, y: cy + 1.25, w: 1.95, h: 0.42, fontSize: 17 });
      text(slide, it.body, { x: x + 0.4, y: cy + 1.8, w: 1.9, h: 1.2, fontSize: 12 });
    }
    if (s.conclusion) {
      rect(slide, 0.14, 5.96, 13.05, 0.84, COLOR.lilac);
      await iconImg(slide, "arrow-right-circle", COLOR.ink, 1.9, 6.17, 0.42);
      text(slide, s.conclusion, { x: 2.55, y: 6.1, w: 9.5, h: 0.56, fontSize: 14, color: COLOR.ink, valign: "middle" });
    }
  } else if (layout === "numbered") {
    rect(slide, 0, 1.54, 6.67, 5.96, COLOR.lilac, { transparency: 10 });
    await leaf(slide, "R");
    eyebrow(slide, eb(s), { x: 1.06, y: 2.0, w: 5, color: COLOR.ink });
    head(slide, s.title, { x: 1.06, y: 2.3, w: 5.0, h: 1.25, fontSize: FIT(s.title, { w: 5.0, h: 1.25, max: 32, min: 24 }), color: COLOR.ink });
    text(slide, s.lead, { x: 1.06, y: 3.7, w: 4.9, h: 0.75, color: COLOR.ink });
    if (s.conclusion) {
      text(slide, "KEY POINT_", { x: 1.06, y: 5.0, w: 4, h: 0.4, fontSize: 15, charSpacing: 5, color: COLOR.ink, valign: "middle", noBalance: true });
      text(slide, s.conclusion, { x: 1.06, y: 5.45, w: 5.0, h: 0.85, color: COLOR.ink });
    }
    s.items.forEach((it, i) => {
      const y = 0.95 + i * 1.0;
      slide.addShape(ctx.shapes.OVAL, { x: 7.67, y, w: 0.58, h: 0.58, fill: { color: CARD[i] }, line: { type: "none" } });
      text(slide, num2(i), { x: 7.67, y, w: 0.58, h: 0.58, fontSize: 15, align: "center", valign: "middle", noBalance: true });
      head(slide, it.head, { x: 8.45, y: y - 0.05, w: 4.4, h: 0.36, fontSize: 15 });
      text(slide, it.body, { x: 8.45, y: y + 0.33, w: 4.4, h: 0.5, fontSize: 11 });
    });
    await pic(slide, s, 0, 7.69, 5.18, 5.64, 2.32, { fallback: "image15.png" });
  } else { // grid2x2
    const colors = [COLOR.terracotta, COLOR.amber, COLOR.ochre, COLOR.charcoal];
    const gi = ["book-open", "briefcase", "video", "trending-up"];
    for (let i = 0; i < 4; i++) {
      const it = s.items[i], x = i % 2 ? 4.09 : 0.91, y = i < 2 ? 0.72 : 3.74;
      rect(slide, x, y, 3.18, 3.0, colors[i]);
      await iconImg(slide, it.icon || gi[i], COLOR.white, x + 0.4, y + 0.4, 0.42, gi[i]);
      head(slide, it.head, { x: x + 0.4, y: y + 1.05, w: 2.6, h: 0.45, fontSize: 18 });
      text(slide, it.body, { x: x + 0.4, y: y + 1.6, w: 2.45, h: 1.0, fontSize: 12 });
    }
    const X = 7.79, Wd = 5.0;
    eyebrow(slide, eb(s), { x: X, y: 0.95, w: Wd });
    const tSize = FIT(s.title, { w: Wd, h: 1.2, max: 30, min: 24 });
    const tH = H(s.title, { w: Wd, fontSize: tSize, lineSpacingMultiple: 1.1 });
    head(slide, s.title, { x: X, y: 1.25, w: Wd, h: tH, fontSize: tSize });
    let y = 1.25 + tH + 0.25;
    if (s.lead) { const h = H(s.lead, { w: Wd, fontSize: 12.5 }); text(slide, s.lead, { x: X, y, w: Wd, h, fontSize: 12.5 }); y += h + 0.5; }
    if (s.conclusion) {
      const h = H(s.conclusion, { w: Wd - 0.25, fontSize: 16, lineSpacingMultiple: 1.25 });
      y = Math.max(y, 4.2);
      rect(slide, X, y + 0.05, 0.06, h - 0.06, COLOR.yellow);
      text(slide, s.conclusion, { x: X + 0.25, y, w: Wd - 0.25, h, fontSize: 16, fontFace: FONT.head });
    }
  }
}

/* ---------- Comparison ---------- */
async function compare(s) {
  const layout = ctx.pickLayout(s, ["panels", "banner"]);
  const slide = add(s);
  const L = s.left || {}, R = s.right || {};
  if (layout === "panels") {
    eyebrow(slide, eb(s), { x: 2.5, y: 0.55, w: 8.33, align: "center" });
    head(slide, s.title, { x: 1.5, y: 0.85, w: 10.33, h: 0.7, fontSize: FIT(s.title, { w: 10.33, h: 0.7, max: 28, min: 22 }), align: "center" });
    text(slide, s.lead, { x: 1.5, y: 1.7, w: 10.33, h: 0.45, align: "center" });
    const panel = async (x, fill, g, color, def) => {
      rect(slide, x, 2.55, 5.25, 3.2, fill);
      await iconImg(slide, g.icon || def, color, x + 0.55, 2.93, 0.42, def);
      head(slide, g.head, { x: x + 1.15, y: 2.87, w: 3.7, h: 0.55, fontSize: 22, color });
      const items = g.items || [];
      const fs = items.length > 3 ? 15 : 16;
      slide.addText(items.map((t, i) => ({ text: t, options: { bullet: true, breakLine: i < items.length - 1 } })), {
        isTextBox: true, x: x + 0.55, y: 3.7, w: 4.3, h: 1.85, fontSize: fs, color, fontFace: FONT.body, paraSpaceAfter: 8, valign: "top", margin: 0,
      });
    };
    await panel(1.2, COLOR.lilac, L, COLOR.ink, "layers");
    await panel(6.88, COLOR.amber, R, COLOR.white, "zap");
    slide.addShape(ctx.shapes.OVAL, { x: 6.315, y: 3.8, w: 0.7, h: 0.7, fill: { color: COLOR.white }, line: { type: "none" } });
    text(slide, "VS", { x: 6.315, y: 3.8, w: 0.7, h: 0.7, fontSize: 15, bold: true, color: COLOR.ink, align: "center", valign: "middle", noBalance: true });
    text(slide, s.conclusion, { x: 1.2, y: 6.0, w: 10.93, h: 0.6, fontSize: 14, align: "center", valign: "middle" });
  } else { // banner
    await pic(slide, s, 0, 0, 2.61, 9.17, 3.07, { fallback: "image4.jpeg" });
    rect(slide, 9.17, 2.61, 4.16, 4.89, COLOR.lilac);
    eyebrow(slide, eb(s), { x: 0.56, y: 0.55, w: 5 });
    head(slide, s.title, { x: 0.56, y: 0.85, w: 8.3, h: 0.7, fontSize: FIT(s.title, { w: 8.3, h: 0.7, max: 30, min: 24 }) });
    text(slide, s.lead, { x: 0.58, y: 1.65, w: 8.2, h: 0.5 });
    let y = 2.95;
    [["A", L], ["B", R]].forEach(([tag, g]) => {
      head(slide, `${tag} · ${g.head || ""}`, { x: 9.55, y, w: 3.4, h: 0.4, fontSize: 16, color: COLOR.ink });
      const body = (g.items || []).map((t) => "· " + t).join("\n");
      const h = H(body, { w: 3.4, fontSize: 11.5, lineSpacingMultiple: 1.2 });
      text(slide, body, { x: 9.55, y: y + 0.48, w: 3.4, h, fontSize: 11.5, color: COLOR.ink, lineSpacingMultiple: 1.2 });
      y += 0.48 + h + 0.3;
    });
    text(slide, s.conclusion, { x: 0.56, y: 5.95, w: 8.2, h: 0.95, fontSize: 12.5 });
  }
}

/* ---------- Data ---------- */
const UNIT = { "亿": 1e8, "万": 1e4, "千": 1e3, "百": 1e2, "k": 1e3, "K": 1e3, "M": 1e6, "B": 1e9 };
function parseValue(v) {
  const m = String(v).replace(/,/g, "").match(/(-?\d+(?:\.\d+)?)\s*(亿|万|千|百|[kKMB])?/);
  return m ? { n: parseFloat(m[1]), mul: UNIT[m[2]] || 1, unit: m[2] || "" } : null;
}
function chartData(s) {
  if (s.chart?.values?.length) return { labels: s.chart.labels || s.items.map((i) => i.label), values: s.chart.values };
  const parsed = s.items.map((i) => parseValue(i.value));
  if (parsed.some((p) => !p)) return null;
  const suffix = (v) => String(v).replace(/[\d.,\s-]/g, "");          // unit text: %, 万, 小时 …
  if (new Set(s.items.map((i) => suffix(i.value))).size > 1) return null; // mixed units can't share one bar chart
  const abs = parsed.map((p) => p.n * p.mul);
  const big = Math.max(...abs);
  const unit = big >= 1e8 ? 1e8 : big >= 1e4 ? 1e4 : 1;
  return { labels: s.items.map((i) => i.label), values: abs.map((v) => Math.round((v / unit) * 100) / 100) };
}
async function stats(s) {
  const data = chartData(s);
  const layout = ctx.pickLayout(s, s.chart && data ? ["chart", "numbers"] : data ? ["numbers", "chart"] : ["numbers"]);
  const slide = add(s);
  const colors = [COLOR.yellow, COLOR.lilac, COLOR.amber, COLOR.terracotta];
  if (layout === "numbers") {
    rect(slide, 6.67, 3.75, 6.67, 3.75, COLOR.lilac);
    await pic(slide, s, 0, 4.67, 0.98, 7.7, 5.32, { fallback: "image19.jpeg" });
    const X = 0.72, Wd = 3.7;
    eyebrow(slide, eb(s), { x: X, y: 0.75, w: Wd });
    const tSize = FIT(s.title, { w: Wd, h: 1.05, max: 24, min: 20 });
    const tH = H(s.title, { w: Wd, fontSize: tSize, lineSpacingMultiple: 1.1 });
    head(slide, s.title, { x: X, y: 1.05, w: Wd, h: tH, fontSize: tSize });
    let y = 1.05 + tH + 0.2;
    if (s.lead) { const h = H(s.lead, { w: Wd, fontSize: 11 }); text(slide, s.lead, { x: X, y, w: Wd, h, fontSize: 11 }); y += h + 0.25; }
    const n = s.items.length, step = n > 3 ? 0.68 : 0.78;
    y = Math.max(y, 3.3);
    const vSize = Math.min(...s.items.map((it) => FIT(it.value, { w: 1.6, h: 0.6, max: 30, min: 18, bold: true })));
    s.items.forEach((it, i) => {
      text(slide, it.value, { x: X, y, w: 1.65, h: step - 0.06, fontSize: vSize, bold: true, valign: "middle", noBalance: true });
      text(slide, it.label, { x: X + 1.7, y, w: 2.0, h: step - 0.06, fontSize: 10.5, valign: "middle" });
      y += step;
    });
    text(slide, "数据来源：" + s.source, { x: X, y: y + 0.05, w: Wd, h: H("数据来源：" + s.source, { w: Wd, fontSize: 9 }), fontSize: 9, noBalance: true });
  } else { // chart
    const X = 1.0, Wd = 5.0;
    eyebrow(slide, eb(s), { x: X, y: 0.8, w: Wd });
    head(slide, s.title, { x: X, y: 1.1, w: Wd + 0.3, h: 0.65, fontSize: FIT(s.title, { w: Wd + 0.3, h: 0.65, max: 28, min: 20 }) });
    let y = 1.95;
    if (s.lead) { const h = H(s.lead, { w: Wd, fontSize: 12 }); text(slide, s.lead, { x: X, y, w: Wd, h, fontSize: 12 }); y += h + 0.25; }
    const n = s.items.length, step = n > 3 ? 0.66 : 0.76;
    y = Math.max(y, 3.2);
    const vSize = Math.min(...s.items.map((it) => FIT(it.value, { w: 1.9, h: 0.6, max: 24, min: 18, bold: true })));
    s.items.forEach((it, i) => {
      rect(slide, X, y + 0.12, 0.14, step - 0.3, colors[i]);
      text(slide, it.value, { x: X + 0.3, y, w: 1.95, h: step - 0.06, fontSize: vSize, bold: true, valign: "middle", noBalance: true });
      text(slide, it.label, { x: X + 2.3, y, w: 2.7, h: step - 0.06, fontSize: 12, valign: "middle" });
      y += step;
    });
    const src = "数据来源：" + s.source;
    text(slide, src, { x: X, y: Math.max(y + 0.1, 6.0), w: Wd, h: H(src, { w: Wd, fontSize: 9 }), fontSize: 9, noBalance: true });
    const d = data || { labels: s.items.map((i) => i.label), values: s.items.map(() => 0) };
    const max = Math.max(...d.values);
    slide.addChart(ctx.charts.BAR, [{ name: s.chart?.unit || "数值", labels: d.labels, values: d.values }], {
      x: 6.7, y: 1.0, w: 5.9, h: 5.5, barDir: "col", barGapWidthPct: 70,
      chartColors: colors.slice(0, d.values.length),
      showTitle: !!s.chart?.title, title: s.chart?.title || "", titleColor: COLOR.white, titleFontSize: 13, titleFontFace: FONT.body,
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: COLOR.white, dataLabelFontSize: 14, dataLabelFontBold: true, dataLabelFontFace: FONT.body,
      catAxisHidden: true, catAxisLineColor: "D9D9D9", // the colored list on the left serves as the legend
      valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: max > 0 ? max * 1.18 : 1, valGridLine: { style: "none" }, catGridLine: { style: "none" },
      showLegend: false, altText: `柱状图：${d.labels.map((l, i) => `${l} ${d.values[i]}`).join("、")}`,
    });
  }
}

/* ---------- Timeline ---------- */
async function timeline(s) {
  ctx.pickLayout(s, ["cards"]);
  const slide = add(s);
  await leaf(slide, "R");
  eyebrow(slide, eb(s), { x: 0.9, y: 0.75, w: 5 });
  head(slide, s.title, { x: 0.9, y: 1.05, w: 11.5, h: 0.65, fontSize: FIT(s.title, { w: 11.5, h: 0.65, max: 28, min: 22 }) });
  text(slide, s.lead, { x: 0.9, y: 1.85, w: 11.3, h: 0.5 });
  const n = s.items.length, gap = 0.45, cw = (11.5 - (n - 1) * gap) / n, iw = cw - 0.55;
  const hSize = Math.min(...s.items.map((it) => FIT(it.head, { w: iw, h: 0.65, max: 30, min: 18 })));
  const bSize = Math.min(...s.items.map((it) => (it.body ? FIT(it.body, { w: iw, h: 1.0, max: 14, min: 11, lineSpacingMultiple: 1.25 }) : 14)));
  for (let i = 0; i < n; i++) {
    const it = s.items[i], x = 0.9 + i * (cw + gap), last = i === n - 1;
    rrect(slide, x, 2.75, cw, 2.75, last ? { fill: COLOR.amber, r: 0.3 } : { fill: COLOR.lilac, transparency: 72, r: 0.3 });
    text(slide, it.time, { x: x + 0.3, y: 3.05, w: iw, h: 0.3, fontSize: 11, bold: true, charSpacing: 2, valign: "middle", noBalance: true });
    head(slide, it.head, { x: x + 0.3, y: 3.45, w: iw, h: 0.7, fontSize: hSize });
    text(slide, it.body, { x: x + 0.3, y: 4.3, w: iw, h: 1.05, fontSize: bSize });
    if (!last) await iconImg(slide, "chevron-right", COLOR.lilac, x + cw + (gap - 0.32) / 2, 3.95, 0.32);
  }
  if (s.conclusion) head(slide, s.conclusion, { x: 0.9, y: 6.1, w: 11.5, h: 0.55, fontSize: 16 });
}

/* ---------- Large image with text ---------- */
async function textColumn(slide, s, X, Wd, top) {
  eyebrow(slide, eb(s), { x: X, y: top, w: Wd });
  const tSize = FIT(s.title, { w: Wd, h: 1.15, max: 30, min: 22 });
  const tH = H(s.title, { w: Wd, fontSize: tSize, lineSpacingMultiple: 1.1 });
  head(slide, s.title, { x: X, y: top + 0.3, w: Wd, h: tH, fontSize: tSize });
  let y = top + 0.3 + tH + 0.2;
  const bh = H(s.body, { w: Wd - 0.1, fontSize: 12 });
  text(slide, s.body, { x: X, y, w: Wd - 0.1, h: bh, fontSize: 12 });
  y += bh + 0.35;
  for (const p of s.points || []) {
    await iconImg(slide, "check-square", COLOR.white, X + 0.02, y + 0.06, 0.3);
    const ph = Math.max(0.42, H(p, { w: Wd - 0.6, fontSize: 12.5 }));
    text(slide, p, { x: X + 0.55, y, w: Wd - 0.6, h: ph, fontSize: 12.5, valign: "middle" });
    y += ph + 0.2;
  }
  if (s.conclusion) {
    y += 0.2;
    const ch = H(s.conclusion, { w: Wd, fontSize: 16, lineSpacingMultiple: 1.25 });
    text(slide, s.conclusion, { x: X, y, w: Wd, h: ch, fontSize: 16, fontFace: FONT.head });
  }
}
async function imageText(s) {
  const layout = ctx.pickLayout(s, ["rightImage", "leftImage"]);
  const slide = add(s);
  if (layout === "rightImage") {
    await pic(slide, s, 0, 7.05, 0.75, 5.41, 6.01, { fallback: "image27.jpeg" });
    await textColumn(slide, s, 1.0, 5.6, 0.85);
  } else {
    rect(slide, 0, 2.84, 3.98, 4.66, COLOR.lilac);
    await pic(slide, s, 0, 1.09, 0.75, 4.39, 5.98, { fallback: "image18.jpeg" });
    await leaf(slide, "R", 5.29);
    await textColumn(slide, s, 6.1, 6.5, 0.85);
  }
}

/* ---------- Pull quote ---------- */
async function quote(s) {
  const layout = ctx.pickLayout(s, s.image ? ["portrait", "center"] : ["center"]);
  const slide = add(s);
  if (layout === "portrait") {
    rect(slide, 7.75, 0, 1.11, 7.5, COLOR.lilac);
    await pic(slide, s, 0, 8.44, 0, 4.89, 7.5, { fallback: "image5.jpeg" });
    await leaf(slide, "L", -0.41);
    text(slide, "“", { x: 0.95, y: 0.75, w: 1.5, h: 1.4, fontSize: 110, color: COLOR.amber, fontFace: "Georgia", valign: "top", noBalance: true, objectName: "引号装饰static" });
    const size = FIT(s.text, { w: 5.9, h: 2.9, max: 36, min: 24, lineSpacingMultiple: 1.3 });
    const h = H(s.text, { w: 5.9, fontSize: size, lineSpacingMultiple: 1.3 });
    const y = Math.max(2.1, 3.75 - h / 2);
    text(slide, s.text, { x: 1.3, y, w: 5.9, h, fontSize: size, fontFace: FONT.head, lineSpacingMultiple: 1.3 });
    if (s.author) {
      hline(slide, 1.32, y + h + 0.52, 0.55, COLOR.amber, 2);
      text(slide, s.author, { x: 2.05, y: y + h + 0.35, w: 5.0, h: 0.36, fontSize: 14, valign: "middle", noBalance: true });
    }
  } else {
    await leaf(slide, "R");
    text(slide, "“", { x: 5.92, y: 0.6, w: 1.5, h: 1.4, fontSize: 110, color: COLOR.amber, fontFace: "Georgia", align: "center", valign: "top", noBalance: true, objectName: "引号装饰static" });
    const size = FIT(s.text, { w: 10, h: 2.6, max: 40, min: 26, lineSpacingMultiple: 1.3 });
    const h = H(s.text, { w: 10, fontSize: size, lineSpacingMultiple: 1.3 });
    const y = Math.max(2.1, 3.85 - h / 2);
    text(slide, s.text, { x: 1.67, y, w: 10, h, fontSize: size, fontFace: FONT.head, lineSpacingMultiple: 1.3, align: "center" });
    if (s.author) {
      hline(slide, 6.39, y + h + 0.4, 0.55, COLOR.amber, 2);
      text(slide, s.author, { x: 3.67, y: y + h + 0.6, w: 6, h: 0.36, fontSize: 14, align: "center", valign: "middle", noBalance: true });
    }
  }
}

/* ---------- Closing ---------- */
async function closing(s) {
  ctx.pickLayout(s, ["portrait"]);
  const slide = add(s);
  await pic(slide, s, 0, 1.23, 0, 5.44, 7.5, { fallback: "image41.jpeg" });
  const X = 6.94;
  eyebrow(slide, s.eyebrow ?? "结语 · CONCLUSION", { x: X, y: 1.25, w: 5, charSpacing: 2 });
  const tSize = FIT(s.title, { w: 6.0, h: 1.5, max: 34, min: 26 });
  const tH = H(s.title, { w: 6.0, fontSize: tSize, lineSpacingMultiple: 1.1 });
  head(slide, s.title, { x: X, y: 1.6, w: 6.0, h: tH, fontSize: tSize });
  if (s.body) text(slide, s.body, { x: X, y: 1.6 + tH + 0.35, w: 5.7, h: H(s.body, { w: 5.7, fontSize: 13 }), fontSize: 13 });
  rect(slide, 11.88, 6.45, 1.45, 0.74, COLOR.lilac);
  const tag = s.tag || "THANK YOU";
  text(slide, tag, { x: 7.6, y: 6.45, w: 4.1, h: 0.74, fontSize: oneLine(tag, { w: 4.1, max: 14, min: 9, bold: true, charSpacing: 3 }), bold: true, charSpacing: 3, align: "right", valign: "middle", noBalance: true });
}

/* ---------- Table (optional type) ---------- */
async function table(s) {
  ctx.pickLayout(s, ["panel"]);
  const slide = add(s);
  await leaf(slide, "L", 0);
  const rows = s.rows || [], cols = s.columns || [];
  const rowH = rows.length > 4 ? 0.62 : 0.72;
  const panelH = 0.35 + 0.45 + rows.length * rowH + 0.35;
  rect(slide, 5.02, 1.2, 8.32, panelH, COLOR.lilac);
  eyebrow(slide, eb(s), { x: 0.6, y: 1.1, w: 4.2 });
  const tSize = FIT(s.title, { w: 4.2, h: 1.2, max: 30, min: 22 });
  const tH = H(s.title, { w: 4.2, fontSize: tSize, lineSpacingMultiple: 1.1 });
  head(slide, s.title, { x: 0.6, y: 1.4, w: 4.2, h: tH, fontSize: tSize });
  text(slide, s.lead, { x: 0.62, y: 1.4 + tH + 0.15, w: 4.1, h: 0.75 });
  await pic(slide, s, 0, 1.06, 3.55, 3.3, 3.4, { fallback: "image7.jpeg" });
  const b = (pt) => ({ type: "solid", pt, color: COLOR.ink }), n = { type: "none" };
  const Hd = (t) => ({ text: t, options: { bold: true, fontSize: 12, border: [n, n, b(1.5), n] } });
  const Cl = (t, j) => ({ text: t ?? "", options: { bold: j === 0, border: [n, n, b(0.75), n] } });
  // Column widths follow content length (each column at least 0.9")
  const len = (t) => [...String(t ?? "")].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2000 ? 0.55 : 1), 0);
  const weight = cols.map((c, j) => Math.max(2, len(c), ...rows.map((r) => len(r[j]))));
  let colW = weight.map((w) => (7.5 * w) / weight.reduce((a, b) => a + b, 0));
  const short = colW.map((w) => Math.max(0.9, w)), extra = short.reduce((a, b) => a + b, 0) - 7.5;
  if (extra > 0) { const wide = short.map((w, j) => (colW[j] > 0.9 ? w : 0)), sum = wide.reduce((a, b) => a + b, 0); colW = short.map((w, j) => (wide[j] ? w - (extra * w) / sum : w)); }
  slide.addTable([cols.map(Hd), ...rows.map((r) => cols.map((_, j) => Cl(r[j], j)))], {
    x: 5.45, y: 1.55, w: 7.5, colW, rowH: [0.45, ...rows.map(() => rowH)],
    fontSize: 11, color: COLOR.ink, fontFace: FONT.body, margin: [0.04, 0.08, 0.04, 0], valign: "middle",
  });
  if (s.conclusion) {
    const y = 1.2 + panelH + 0.3;
    text(slide, "KEY IDEA_", { x: 5.45, y, w: 4, h: 0.4, fontSize: 15, charSpacing: 5, valign: "middle", noBalance: true });
    text(slide, s.conclusion, { x: 5.45, y: y + 0.45, w: 7.3, h: 0.8, fontSize: 14 });
  }
}

/* ---------- Steps (optional type) ---------- */
async function steps(s) {
  ctx.pickLayout(s, ["imageSteps"]);
  const slide = add(s);
  await pic(slide, s, 0, 1.4, 0.65, 4.45, 5.93, { fallback: "image20.jpeg" });
  const X = 6.9, Wd = 5.6;
  eyebrow(slide, eb(s), { x: X, y: 0.75, w: Wd });
  head(slide, s.title, { x: X, y: 1.05, w: Wd, h: 0.65, fontSize: FIT(s.title, { w: Wd, h: 0.65, max: 28, min: 22 }) });
  let y = 1.85;
  if (s.lead) { const h = H(s.lead, { w: Wd, fontSize: 12 }); text(slide, s.lead, { x: X, y, w: Wd, h, fontSize: 12 }); y += h + 0.35; }
  const n = s.items.length;
  s.items.forEach((it, i) => {
    const label = `STEP ${num2(i)} · ${it.head}`;
    text(slide, label, { x: X, y, w: Wd, h: 0.35, fontSize: 13, bold: true, charSpacing: 1, valign: "middle", noBalance: true });
    const bh = Math.max(0.3, H(it.body, { w: Wd, fontSize: 11.5 }));
    text(slide, it.body, { x: X, y: y + 0.4, w: Wd, h: bh, fontSize: 11.5 });
    y += 0.4 + bh + (n > 3 ? 0.28 : 0.4);
  });
}

/* ============================ Entry point ============================ */
async function render(deck, c) {
  ctx = c;
  ctx.pres.defineSlideMaster({ title: MASTER, background: { color: COLOR.bg }, objects: [] });
  await ctx.renderAll({ cover, toc, section, points3, points4, compare, stats, timeline, imageText, quote, closing, table, steps });
}

module.exports = { render };
