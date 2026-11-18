/**
 * Template: Ink Heritage (ink-heritage)
 * ------------------------------------------------------------------
 * Visual source: the web template "春江花月夜 · 唐诗国风" (pure black background, dusty-rose Song-typeface giant characters,
 * vertical text, artifacts / palace roofs / calligraphy photos, a rose-colored block under each section's object).
 * Objects (roof, vase, lion, palace, gilded vase), the dragon carving, mountains and calligraphy texture were cut out of the
 * original's media; giant characters, frames, rose blocks, hairlines and diamonds are drawn here.
 *
 * Fonts: 宋体 (SimSun, ships with Windows) everywhere, like the original.
 * Vertical text is written as one character per line ("\n" between characters) so QA can measure it.
 *
 * Layout list (keep in sync with meta.json → layouts):
 *   cover     giant                  two giant rose characters from the title + framed title (vertical when ≤ 6 chars)
 *   toc       columns                numeral 壹贰叁… + vertical heading + vertical sub per column, hairline dividers
 *   section   zhang                  giant 章 + giant numeral, an artifact standing on a rose block that holds the text
 *   points3   icons | panel | plates three icon columns + framed photo / photo band + rose panel / three round images, staggered
 *   points4   vase | clouds          gilded vase over mountains with two items per side / photo + four rows with cloud marks
 *   compare   split | ledger         outlined box vs. rose box / two ledgers around a center line
 *   stats     boxes | chart          rounded outlined number boxes / number list + bar chart
 *   timeline  scroll                 hairline with diamonds, time above, heading + text below
 *   imageText strips | half          five photo strips + centered text / photo bleeding off the left half + text column
 *   quote     frames | dragon        two framed photos around the quote / quote over the dragon carving
 *   closing   giant                  same staging as the cover
 *   table     ledger      (optional) rose header row + hairline rows
 *   steps     numerals    (optional) big numerals 壹贰叁肆 + connectors
 */
const COLOR = {
  bg: "000000", rose: "AB8B7E", roseD: "6E5A52", line: "3A302C", body: "D8CCC6", sub: "A89A93",
  ink: "1A1A1A", white: "FFFFFF", orange: "FB5C00", red: "C00000", gray: "8C8C8C",
};
const FONT = { head: "宋体", body: "宋体" };
const CW = 13.333, CX = CW / 2;
const CN = "壹贰叁肆伍陆柒捌玖拾";
const OBJECTS = [["obj_roof.png", 513, 294], ["obj_vase.png", 195, 289], ["obj_lion.png", 296, 285], ["obj_palace.png", 502, 259]];

/* ---------------- Typesetting components ---------------- */
let ctx;
function text(slide, str, o) {
  if (str === undefined || str === null || str === "") return 0;
  const opt = { isTextBox: true, margin: 0, color: COLOR.body, fontFace: FONT.body, fontSize: 12.5, valign: "top", lineSpacingMultiple: 1.3, ...o };
  const s = o.noBalance ? String(str) : ctx.balance(String(str), { w: opt.w, fontSize: opt.fontSize, bold: opt.bold, charSpacing: opt.charSpacing, lineSpacingMultiple: opt.lineSpacingMultiple });
  delete opt.noBalance;
  slide.addText(s, opt);
  return opt.h;
}
const head = (slide, str, o) => text(slide, str, { fontFace: FONT.head, valign: "middle", lineSpacingMultiple: 1.1, color: COLOR.rose, ...o });
const oneLine = (str, o) => ctx.fitLine(String(str || ""), { ...o, w: o.w * 0.95 });   // 5% safety: serif glyphs render slightly wider than the estimate
const H = (str, o) => (str ? ctx.measure(String(str), { lineSpacingMultiple: 1.3, ...o }).needH + 0.04 : 0);
const FIT = (str, o) => ctx.fit(String(str || ""), { lineSpacingMultiple: 1.15, ...o });
const longest = (str, o) => ctx.measure(String(str || ""), { w: 40, ...o }).longest || 0;
const num2 = (i) => String(i + 1).padStart(2, "0");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const vert = (str) => [...String(str || "")].filter((ch) => ch.trim()).join("\n");
const vlen = (str) => [...String(str || "")].filter((ch) => ch.trim()).length;

const BREAK_AFTER = /[，。、；：！？,.;:!?）》”]/, NO_START = /^[，。、；：！？,.;:!?）》”]/;
function evenBreak(str, o) {
  str = String(str ?? "");
  if (!str || str.includes("\n")) return str;
  const m = ctx.measure(str, o);
  if (m.lines <= 1) return str;
  const toks = str.match(/[⺀-￿]|[^\s⺀-￿]+\s*|\s+/g) || [];
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
function line(slide, x, y, w, h, color = COLOR.rose, width = 0.75) {
  slide.addShape(ctx.shapes.LINE, { x, y, w, h, line: { color, width }, objectName: "线条装饰static" });
}
function rect(slide, x, y, w, h, { fill, line: lc, lw = 0.75, tr = 0, name = "色块", radius } = {}) {
  slide.addShape(radius ? ctx.shapes.ROUNDED_RECTANGLE : ctx.shapes.RECTANGLE, {
    x, y, w, h, ...(radius ? { rectRadius: radius } : {}),
    fill: fill ? { color: fill, transparency: tr } : { type: "none" }, line: lc ? { color: lc, width: lw } : { type: "none" }, objectName: name,
  });
}
function diamond(slide, cx, cy, s = 0.14, color = COLOR.rose) {
  slide.addShape(ctx.shapes.RECTANGLE, { x: cx - s / 2, y: cy - s / 2, w: s, h: s, rotate: 45, fill: { color }, line: { type: "none" }, objectName: "菱形装饰static" });
}
/** Hairline with a diamond in the middle */
function divider(slide, cx, y, w) {
  line(slide, cx - w / 2, y, w / 2 - 0.16, 0, COLOR.rose, 0.75);
  line(slide, cx + 0.16, y, w / 2 - 0.16, 0, COLOR.rose, 0.75);
  diamond(slide, cx, y, 0.13);
}
async function iconImg(slide, name, color, x, y, s, def) {
  slide.addImage({ data: await ctx.icon(name, color, def), x, y, w: s, h: s, objectName: "图标static" });
}
/** Photo with a thin rose frame offset behind it */
async function framedPic(slide, s, idx, x, y, w, h, fallback, { offset = 0.15, circle = false } = {}) {
  if (circle) {
    slide.addShape(ctx.shapes.OVAL, { x: x - 0.1, y: y - 0.1, w: w + 0.2, h: h + 0.2, fill: { type: "none" }, line: { color: COLOR.rose, width: 0.75 }, objectName: "圆框装饰static" });
  } else rect(slide, x + offset, y + offset, w, h, { line: COLOR.rose, name: "错位框装饰static" });
  await ctx.pic(slide, s, idx, x, y, w, h, { fallback, circle });
}
/** Giant decorative characters (the original's oversized rose glyphs bleeding off the page) */
function giant(slide, ch, x, y, size, color = COLOR.rose) {
  if (!ch) return;
  const em = size / 72;
  text(slide, ch, { x, y, w: em * 1.15, h: em * 1.25, fontSize: size, color, fontFace: FONT.head, valign: "top", lineSpacingMultiple: 1, noBalance: true, objectName: "巨字装饰static" });
}
const cjk = (str) => [...String(str || "")].filter((ch) => /[一-鿿]/.test(ch));

/* ---------- Pages ---------- */
function add(s) { return ctx.addSlide(s, { master: "IH_BLACK", bg: COLOR.bg }); }
/** Content-page header: rose title top-left, eyebrow on the right, a full-width hairline */
function header(slide, s, o = {}) {
  const label = s.eyebrow !== undefined ? s.eyebrow : (s._sectionNo ? `${CN[(s._sectionNo - 1) % 10]} · ${s._sectionTitle}` : "");
  const lw = 3.2, X = 0.8;
  const tw = o.titleW ?? (label ? 8.6 : 11.7);
  const size = oneLine(s.title, { w: tw, max: o.max || 28, min: 20 });
  head(slide, s.title, { x: X, y: 0.38, w: tw, h: 0.72, fontSize: size });
  if (label) text(slide, label, { x: CW - 0.8 - lw, y: 0.55, w: lw, h: 0.4, fontSize: oneLine(label, { w: lw, max: 12, min: 10 }), color: COLOR.sub, align: "right", valign: "middle", noBalance: true });
  line(slide, 0, 1.18, CW, 0, COLOR.roseD, 0.75);
  return 1.18;
}
function top(slide, s, o = {}) {
  const after = header(slide, s, o);
  if (!s.lead) return Math.max(after + 0.4, o.minTop ?? 1.6);
  const w = o.leadW ?? 11.7, size = 12.5;
  const h = H(s.lead, { w, fontSize: size });
  text(slide, s.lead, { x: 0.8, y: after + 0.22, w, h, fontSize: size, color: COLOR.sub });
  return Math.max(after + 0.22 + h + 0.3, o.minTop ?? 1.6);
}
function conclusionLine(slide, str, y, { x = 0.8, w = 11.73, size = 15, align = "center" } = {}) {
  if (!str) return 0;
  const h = H(str, { w, fontSize: size });
  text(slide, str, { x, y, w, h, fontSize: size, color: COLOR.rose, align });
  return h;
}

/* ---------- Cover / closing staging ---------- */
/** Framed title: vertical (one char per line) when short, else horizontal; returns the frame's bottom */
function framedTitle(slide, str, cy) {
  const n = vlen(str);
  if (n <= 6 && !/[A-Za-z0-9]/.test(str)) {
    const size = clamp((3.9 * 72) / (n * 1.2), 40, 80);
    const tH = H(vert(str), { w: size / 72 * 1.3, fontSize: size, lineSpacingMultiple: 1.0 });
    const bw = size / 72 + 0.75, bh = tH + 0.5, y = Math.max(0.45, cy - bh / 2);
    rect(slide, CX - bw / 2, y, bw, bh, { fill: COLOR.bg, line: COLOR.white, lw: 1.5, name: "标题框" });
    text(slide, vert(str), { x: CX - bw / 2, y: y + 0.25, w: bw, h: tH, fontSize: size, color: COLOR.white, fontFace: FONT.head, align: "center", lineSpacingMultiple: 1.0, noBalance: true });
    return y + bh;
  }
  const tw = 7.6;
  const size = FIT(str, { w: tw, h: 1.9, max: 54, min: 30 });
  const t = evenBreak(str, { w: tw, fontSize: size });
  const tH = H(t, { w: tw, fontSize: size, lineSpacingMultiple: 1.15 });
  const bw = Math.min(8.6, Math.max(...t.split("\n").map((l) => longest(l, { fontSize: size }))) + 1.0), bh = tH + 0.6, y = Math.max(0.45, cy - bh / 2);
  rect(slide, CX - bw / 2, y, bw, bh, { fill: COLOR.bg, line: COLOR.white, lw: 1.5, name: "标题框" });
  text(slide, t, { x: CX - bw / 2 + 0.3, y: y + 0.3, w: bw - 0.6, h: tH, fontSize: size, color: COLOR.white, fontFace: FONT.head, align: "center", lineSpacingMultiple: 1.15, noBalance: true });
  return y + bh;
}
function giantPair(slide, str, off = 0) {
  const cs = cjk(str);
  giant(slide, cs[0], -1.15, -1.2 + off, 400);   // glyph bottom ≈ y + em × 1.08, kept above the subtitle (y ≥ 5.15)
  giant(slide, cs[1] || cs[0], 6.85, -1.15 + off, 400);
}
/** When little text goes under the frame, move the whole composition down so the page isn't top-heavy */
const stageOffset = (restH) => clamp((1.5 - restH) * 0.5, 0, 0.7);
function spacedTag(slide, str, y) {
  const size = oneLine(str, { w: 9.5, max: 12, min: 9, charSpacing: 6 });
  const w = Math.min(10, longest(str, { fontSize: size, charSpacing: 6 }) + 0.4);
  text(slide, str, { x: CX - w / 2, y, w, h: 0.32, fontSize: size, charSpacing: 6, color: COLOR.body, align: "center", valign: "middle", noBalance: true });
  line(slide, CX - w / 2 - 0.3, y + 0.38, w + 0.6, 0, COLOR.roseD, 0.75);
}

/* ============================ Page types ============================ */

async function cover(s) {
  ctx.pickLayout(s, ["giant"]);
  const slide = add(s);
  const off = stageOffset((s.subtitle ? 0.55 : 0) + (s.desc ? H(s.desc, { w: 9, fontSize: 12 }) + 0.15 : 0) + (s.tag ? 0.45 : 0));
  giantPair(slide, s.title, off);
  let y = framedTitle(slide, s.title, 2.75 + off);
  y = Math.max(5.15 + off, y + 0.3);
  if (s.subtitle) { const sz = oneLine(s.subtitle, { w: 10, max: 22, min: 14 }); text(slide, s.subtitle, { x: CX - 5, y, w: 10, h: 0.45, fontSize: sz, color: COLOR.rose, align: "center", valign: "middle", noBalance: true }); y += 0.55; }
  if (s.desc) { const h = H(s.desc, { w: 9, fontSize: 12 }); text(slide, s.desc, { x: CX - 4.5, y, w: 9, h, fontSize: 12, color: COLOR.sub, align: "center" }); y += h + 0.15; }
  if (s.tag) spacedTag(slide, s.tag, Math.min(y + 0.05, 6.75));
}

async function closing(s) {
  ctx.pickLayout(s, ["giant"]);
  const slide = add(s);
  const off = stageOffset((s.body ? H(s.body, { w: 9, fontSize: 13 }) + 0.2 : 0) + (s.tag ? 0.45 : 0));
  giantPair(slide, s.title, off);
  let y = framedTitle(slide, s.title, 2.75 + off);
  y = Math.max(5.15 + off, y + 0.3);
  if (s.body) { const h = H(s.body, { w: 9, fontSize: 13 }); text(slide, s.body, { x: CX - 4.5, y, w: 9, h, fontSize: 13, color: COLOR.body, align: "center" }); y += h + 0.2; }
  if (s.tag) spacedTag(slide, s.tag, Math.min(y + 0.05, 6.75));
}

async function toc(s) {
  ctx.pickLayout(s, ["columns"]);
  const slide = add(s);
  const tt = s.title || "目录";
  const ts = oneLine(tt, { w: 3.0, max: 32, min: 22 });
  head(slide, tt, { x: 0.8, y: 0.35, w: 3.0, h: 0.75, fontSize: ts });
  text(slide, "CONTENTS", { x: 0.8 + longest(tt, { fontSize: ts }) + 0.3, y: 0.52, w: 2, h: 0.4, fontSize: 11, charSpacing: 4, color: COLOR.sub, valign: "middle", noBalance: true });
  line(slide, 0, 1.18, CW, 0, COLOR.roseD, 0.75);
  const items = s.items || [], n = items.length;
  const X0 = 0.8, W = 11.73, cw = W / n;
  const vTop = 2.85, vBottom = s.desc ? 5.85 : 6.75, avail = vBottom - vTop;
  const hMax = Math.max(...items.map((it) => vlen(it.head)));
  const sMax = Math.max(0, ...items.map((it) => vlen(it.sub)));
  const hs = clamp((avail * 72) / (hMax * 1.2), 13, 22);
  const ss = sMax ? clamp((avail * 72) / (sMax * 1.2), 10, 12) : 0;
  for (let i = 0; i < n; i++) {
    const it = items[i], cx = X0 + cw * (i + 0.5);
    if (i > 0) line(slide, X0 + cw * i, 1.7, 0, vBottom - 1.7, COLOR.line, 0.75);
    text(slide, CN[i % 10], { x: cx - 0.6, y: 1.6, w: 1.2, h: 0.85, fontSize: 40, color: COLOR.rose, fontFace: FONT.head, align: "center", valign: "middle", lineSpacingMultiple: 1.0, noBalance: true });
    line(slide, cx - 0.2, 2.55, 0.4, 0, COLOR.rose, 1);
    const hw = hs / 72 * 1.3, sw = ss / 72 * 1.3, gap = it.sub ? 0.1 : 0;
    const total = hw + (it.sub ? gap + sw : 0);
    const hx = cx - total / 2;
    text(slide, vert(it.head), { x: hx, y: vTop, w: hw, h: H(vert(it.head), { w: hw, fontSize: hs, lineSpacingMultiple: 1.0 }), fontSize: hs, color: COLOR.white, fontFace: FONT.head, align: "center", lineSpacingMultiple: 1.0, noBalance: true });
    if (it.sub) text(slide, vert(it.sub), { x: hx + hw + gap, y: vTop + 0.1, w: sw, h: H(vert(it.sub), { w: sw, fontSize: ss, lineSpacingMultiple: 1.0 }), fontSize: ss, color: COLOR.rose, align: "center", lineSpacingMultiple: 1.0, noBalance: true });
  }
  if (s.desc) text(slide, s.desc, { x: 1.3, y: 6.15, w: 10.73, h: H(s.desc, { w: 10.73, fontSize: 12 }), fontSize: 12, color: COLOR.sub, align: "center" });
}

/* ---------- Section page ---------- */
async function section(s) {
  ctx.pickLayout(s, ["zhang"]);
  const slide = add(s);
  const no = s._sectionNo || 1;
  giant(slide, "章", -1.75, -0.05, 400);
  giant(slide, CN[(no - 1) % 10], 9.45, 0.55, 360);
  const X = 4.45, W = 4.45, iw = W - 0.6;
  const label = s._part || `PART ${num2(no - 1)}`;
  const tSize = FIT(s.title, { w: iw, h: 1.0, max: 26, min: 18 });
  const title = evenBreak(s.title, { w: iw, fontSize: tSize });
  const tH = H(title, { w: iw, fontSize: tSize, lineSpacingMultiple: 1.15 });
  const en = s.en ? s.en.toUpperCase() : "";
  const dH = H(s.desc, { w: iw, fontSize: 12 });
  const kw = (s.keywords || []).join(" · ");
  const kH = H(kw, { w: iw, fontSize: 11 });
  const enH = en ? H(en, { w: iw, fontSize: 11, charSpacing: 1, lineSpacingMultiple: 1.15 }) : 0;
  const h = 0.28 + 0.3 + 0.12 + tH + (en ? enH + 0.06 : 0) + (dH ? 0.15 + dH : 0) + (kH ? 0.12 + kH : 0) + 0.3;
  const by = 6.95 - h;
  // artifact standing on the block
  const [file, ow, oh] = OBJECTS[(no - 1) % OBJECTS.length];
  const maxH = Math.min(3.0, by - 0.35), maxW = W;
  let w = maxW, hh = (w * oh) / ow;
  if (hh > maxH) { hh = maxH; w = (hh * ow) / oh; }
  slide.addImage({ path: ctx.asset(file), x: X + (W - w) / 2, y: by - hh + 0.02, w, h: hh, objectName: "器物" });
  rect(slide, X, by, W, h, { fill: COLOR.rose, name: "色块" });
  let y = by + 0.28;
  deco(slide, "cloud.png", X + 0.3, y + 0.04, 0.32, 0.23, "祥云装饰static");
  text(slide, label, { x: X + 0.72, y, w: iw - 0.42, h: 0.3, fontSize: 11, charSpacing: 2, color: COLOR.ink, valign: "middle", noBalance: true });
  y += 0.42;
  text(slide, title, { x: X + 0.3, y, w: iw, h: tH, fontSize: tSize, color: COLOR.ink, fontFace: FONT.head, lineSpacingMultiple: 1.15, noBalance: true });
  y += tH;
  if (en) { text(slide, en, { x: X + 0.3, y: y + 0.04, w: iw, h: enH, fontSize: 11, charSpacing: 1, color: COLOR.ink, lineSpacingMultiple: 1.15, noBalance: true }); y += enH + 0.06; }
  if (dH) { y += 0.15; text(slide, s.desc, { x: X + 0.3, y, w: iw, h: dH, fontSize: 12, color: COLOR.ink }); y += dH; }
  if (kH) { y += 0.12; text(slide, kw, { x: X + 0.3, y, w: iw, h: kH, fontSize: 11, color: COLOR.ink }); }
}

/* ---------- 3 key points ---------- */
async function points3(s) {
  const layout = ctx.pickLayout(s, ["icons", "panel", "plates"]);
  const slide = add(s);
  const icons = ["feather", "book-open", "compass"];
  if (layout === "icons") {
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 6.15 : 6.85;
    const pw = 3.95, ph = Math.min(3.6, bottom - y0 - 0.25), px = 8.5, py = y0 + (bottom - y0 - ph) / 2 - 0.08;
    await framedPic(slide, s, 0, px, py, pw, ph, "photo_tea.jpg");
    const X0 = 0.8, cw = 7.3 / 3;
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw - 0.3, max: 18, min: 14 })));
    const bodyH = Math.max(...s.items.map((it) => H(it.body, { w: cw - 0.4, fontSize: 12.5 })));
    const total = 0.5 + 0.3 + 0.48 + 0.15 + bodyH;
    const iy = y0 + Math.max(0, (bottom - y0 - total) / 2);
    for (let i = 0; i < 3; i++) {
      const it = s.items[i], cx = X0 + cw * (i + 0.5);
      if (i > 0) line(slide, X0 + cw * i, iy + 0.05, 0, total, COLOR.roseD, 0.75);
      await iconImg(slide, it.icon || icons[i], COLOR.rose, cx - 0.25, iy, 0.5, icons[i]);
      head(slide, it.head, { x: cx - (cw - 0.3) / 2, y: iy + 0.8, w: cw - 0.3, h: 0.48, fontSize: hSize, align: "center" });
      text(slide, it.body, { x: cx - (cw - 0.4) / 2, y: iy + 1.43, w: cw - 0.4, h: bodyH, fontSize: 12.5, align: "center" });
    }
    conclusionLine(slide, s.conclusion, 6.35);
  } else if (layout === "panel") {
    header(slide, s);
    const PX = 7.05, PW = 5.55, PY = 1.5, PH = 6.95 - 1.5;
    const leadH = H(s.lead, { w: 6.2, fontSize: 12.5 }), concH = H(s.conclusion, { w: 6.2, fontSize: 14 });
    const below = (leadH ? leadH + 0.25 : 0) + (concH ? concH + 0.2 : 0);
    const bh = Math.min(3.0, 6.9 - 1.6 - below - 0.3);
    const by = 1.6 + Math.max(0.2, (6.9 - 1.6 - bh - below - 0.3) / 2);
    await ctx.pic(slide, s, 0, 0, by, 7.6, bh, { fallback: "photo_type2.jpg" });
    rect(slide, PX, PY, PW, PH, { fill: COLOR.rose, name: "色块" });
    let ly = by + bh + 0.3;
    if (leadH) { text(slide, s.lead, { x: 0.8, y: ly, w: 6.2, h: leadH, fontSize: 12.5, color: COLOR.body }); ly += leadH + 0.2; }
    if (concH) text(slide, s.conclusion, { x: 0.8, y: ly, w: 6.2, h: concH, fontSize: 14, color: COLOR.rose });
    const iw = PW - 0.8;
    const hs = Math.min(...s.items.map((it) => oneLine(it.head, { w: iw - 0.3, max: 16, min: 13 })));
    const bH = s.items.map((it) => H(it.body, { w: iw, fontSize: 12 }));
    const rows = bH.map((b) => 0.42 + 0.14 + b);
    const gap = clamp((PH - 0.6 - rows.reduce((a, b) => a + b, 0)) / 2, 0.2, 0.6);
    let y = PY + Math.max(0.3, (PH - rows.reduce((a, b) => a + b, 0) - gap * 2) / 2);
    s.items.forEach((it, i) => {
      const hw = Math.min(iw, longest(it.head, { fontSize: hs }) + 0.3);
      rect(slide, PX + 0.4, y, hw, 0.42, { line: COLOR.ink, lw: 0.75, name: "标题框" });
      text(slide, it.head, { x: PX + 0.4, y, w: hw, h: 0.42, fontSize: hs, color: COLOR.ink, fontFace: FONT.head, align: "center", valign: "middle", noBalance: true });
      text(slide, it.body, { x: PX + 0.4, y: y + 0.56, w: iw, h: bH[i], fontSize: 12, color: COLOR.ink });
      y += rows[i] + gap;
    });
  } else { // plates
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 6.15 : 6.85;
    const X0 = 0.8, cw = 11.73 / 3;
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw - 0.6, max: 18, min: 14 })));
    const bodyH = Math.max(...s.items.map((it) => H(it.body, { w: cw - 0.8, fontSize: 12.5 })));
    const textH = 0.5 + 0.1 + bodyH;
    const stagger = 0.3;
    const d = clamp(bottom - y0 - textH - 0.45 - stagger, 1.3, 2.3);
    const fbs = ["photo_plate.jpg", "photo_dish.jpg", "photo_roof.jpg"];
    for (let i = 0; i < 3; i++) {
      const it = s.items[i], cx = X0 + cw * (i + 0.5);
      const cy0 = y0 + 0.1 + (i === 1 ? stagger : 0);
      await framedPic(slide, s, i, cx - d / 2, cy0, d, d, fbs[i], { circle: true });
      const ty = cy0 + d + 0.3;
      head(slide, it.head, { x: cx - (cw - 0.6) / 2, y: ty, w: cw - 0.6, h: 0.5, fontSize: hSize, align: "center" });
      text(slide, it.body, { x: cx - (cw - 0.8) / 2, y: ty + 0.6, w: cw - 0.8, h: bodyH, fontSize: 12.5, align: "center" });
    }
    conclusionLine(slide, s.conclusion, 6.35);
  }
}

/* ---------- 4 key points ---------- */
async function points4(s) {
  const layout = ctx.pickLayout(s, ["vase", "clouds"]);
  const slide = add(s);
  if (layout === "vase") {
    let y0 = top(slide, s);
    if (s.conclusion) { const h = conclusionLine(slide, s.conclusion, y0 - 0.1, { size: 14 }); y0 += h + 0.15; }
    deco(slide, "mountains.jpg", CX - 3.6, 7.5 - 5.03, 7.2, 5.03, "远山装饰static");
    const vh = Math.min(4.3, 7.4 - y0), vw = (vh * 259) / 474;
    slide.addImage({ path: ctx.asset("obj_vase_gold.png"), x: CX - vw / 2, y: 7.4 - vh, w: vw, h: vh, objectName: "器物" });
    const colW = 3.7;
    const hs = Math.min(...s.items.map((it) => oneLine(it.head, { w: colW, max: 20, min: 14, charSpacing: 3 })));
    const bodyH = Math.max(...s.items.map((it) => H(it.body, { w: colW, fontSize: 12.5 })));
    const rowH = 0.5 + 0.12 + bodyH;
    const gap = clamp((6.85 - y0 - rowH * 2) / 1, 0.4, 1.3);
    const ry0 = y0 + Math.max(0, (6.85 - y0 - rowH * 2 - gap) / 2);
    s.items.forEach((it, i) => {
      const left = i < 2, x = left ? 0.8 : CW - 0.8 - colW, y = ry0 + (i % 2) * (rowH + gap);
      const align = left ? "right" : "left";
      head(slide, it.head, { x, y, w: colW, h: 0.5, fontSize: hs, charSpacing: 3, align });
      line(slide, left ? x + colW - 0.5 : x, y + 0.55, 0.5, 0, COLOR.rose, 0.75);
      text(slide, it.body, { x, y: y + 0.62, w: colW, h: bodyH, fontSize: 12.5, align });
    });
  } else { // clouds
    const y0 = top(slide, s);
    const bottom = 6.85;
    await framedPic(slide, s, 0, 0.8, y0, 4.5, bottom - y0 - 0.15, "photo_hanfu.jpg");
    const X = 5.95, W = 6.55;
    const concH = H(s.conclusion, { w: W, fontSize: 14 });
    const hs = Math.min(...s.items.map((it) => oneLine(it.head, { w: W - 0.8, max: 17, min: 13 })));
    const bH = s.items.map((it) => H(it.body, { w: W - 0.8, fontSize: 12.5 }));
    const rows = bH.map((b) => 0.42 + 0.06 + b);
    const avail = bottom - y0 - (concH ? concH + 0.3 : 0);
    const gap = clamp((avail - rows.reduce((a, b) => a + b, 0)) / 3, 0.15, 0.5);
    let y = y0 + Math.max(0, (avail - rows.reduce((a, b) => a + b, 0) - gap * 3) / 2);
    s.items.forEach((it, i) => {
      deco(slide, "cloud.png", X, y + 0.06, 0.48, 0.35, "祥云装饰static");
      head(slide, it.head, { x: X + 0.8, y, w: W - 0.8, h: 0.42, fontSize: hs });
      text(slide, it.body, { x: X + 0.8, y: y + 0.48, w: W - 0.8, h: bH[i], fontSize: 12.5 });
      y += rows[i] + gap;
    });
    if (concH) { line(slide, X, y + 0.02, W, 0, COLOR.roseD, 0.75); text(slide, s.conclusion, { x: X, y: y + 0.15, w: W, h: concH, fontSize: 14, color: COLOR.rose }); }
  }
}

/* ---------- Comparison ---------- */
async function compare(s) {
  const layout = ctx.pickLayout(s, ["split", "ledger"]);
  const slide = add(s);
  const L = s.left || {}, R = s.right || {};
  const y0 = top(slide, s);
  const bottom = s.conclusion ? 6.1 : 6.85;
  const nMax = Math.max((L.items || []).length, (R.items || []).length, 2);
  if (layout === "split") {
    const bw = 5.6, gap = CW - 1.6 - 2 * bw;
    const ch = clamp(1.3 + nMax * 0.62 + 0.4, 3.0, bottom - y0);
    const cy = y0 + (bottom - y0 - ch) * 0.4;
    const box = async (x, g, filled, def) => {
      rect(slide, x, cy, bw, ch, filled ? { fill: COLOR.rose, name: "色块" } : { line: COLOR.rose, lw: 1, name: "框" });
      const fg = filled ? COLOR.ink : COLOR.rose, tc = filled ? COLOR.ink : COLOR.body;
      await iconImg(slide, g.icon || def, fg, x + 0.45, cy + 0.38, 0.42, def);
      head(slide, g.head, { x: x + 1.05, y: cy + 0.3, w: bw - 1.4, h: 0.58, fontSize: oneLine(g.head, { w: bw - 1.4, max: 24, min: 17 }), color: fg });
      line(slide, x + 0.45, cy + 1.05, bw - 0.9, 0, filled ? COLOR.ink : COLOR.roseD, 0.75);
      const items = g.items || [];
      const step = Math.min(0.7, (ch - 1.3 - 0.3) / Math.max(items.length, 1));
      items.forEach((t, i) => {
        const y = cy + 1.25 + i * step;
        diamond(slide, x + 0.6, y + step / 2, 0.1, fg);
        text(slide, t, { x: x + 0.85, y, w: bw - 1.2, h: step, fontSize: 14, color: tc, valign: "middle", noBalance: true });
      });
    };
    await box(0.8, L, false, "circle");
    await box(0.8 + bw + gap, R, true, "check-circle");
    diamond(slide, CX, cy + ch / 2, 0.16, COLOR.orange);
    if (s.conclusion) conclusionLine(slide, s.conclusion, Math.min(6.3, cy + ch + 0.2));
  } else { // ledger
    const half = 11.73 / 2, ch = Math.min(bottom - y0, 1.4 + nMax * 0.72);
    const cy = y0 + (bottom - y0 - ch) * 0.35;
    line(slide, CX, cy, 0, ch, COLOR.rose, 0.75);
    diamond(slide, CX, cy + ch / 2, 0.16);
    const col = async (x, g, def) => {
      const w = half - 0.7;
      await iconImg(slide, g.icon || def, COLOR.rose, x + w / 2 - 0.22, cy, 0.44, def);
      head(slide, g.head, { x, y: cy + 0.52, w, h: 0.6, fontSize: oneLine(g.head, { w, max: 26, min: 18 }), align: "center" });
      const items = g.items || [];
      items.forEach((t, i) => {
        const y = cy + 1.3 + i * 0.72;
        text(slide, t, { x, y, w, h: 0.6, fontSize: 14, align: "center", valign: "middle", noBalance: true });
        line(slide, x + 0.6, y + 0.66, w - 1.2, 0, COLOR.line, 0.75);
      });
    };
    await col(0.8 + 0.1, L, "circle");
    await col(CX + 0.6, R, "check-circle");
    if (s.conclusion) conclusionLine(slide, s.conclusion, Math.min(6.3, cy + ch + 0.25));
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
function sourceLine(slide, s, x, y, w, align = "left") {
  const src = "数据来源：" + s.source;
  text(slide, src, { x, y, w, h: H(src, { w, fontSize: 10 }), fontSize: 10, color: COLOR.gray, noBalance: true, align });
}
const SERIES = [COLOR.rose, COLOR.orange, COLOR.body, COLOR.roseD];
async function stats(s) {
  const data = chartData(s);
  const layout = ctx.pickLayout(s, s.chart && data ? ["chart", "boxes"] : data ? ["boxes", "chart"] : ["boxes"]);
  const slide = add(s);
  const y0 = top(slide, s);
  if (layout === "boxes") {
    const n = s.items.length, gap = 0.45, W = Math.min(11.2, n * 2.9 + (n - 1) * gap), cw = (W - (n - 1) * gap) / n, x0 = CX - W / 2;
    const vSize = Math.min(...s.items.map((it) => oneLine(it.value, { w: cw - 0.75, max: 40, min: 20 })));
    const lH = Math.max(...s.items.map((it) => H(it.label, { w: cw - 0.5, fontSize: 13 })));
    const ch = 0.35 + 0.95 + 0.3 + lH + 0.4;
    const cy = y0 + Math.max(0.1, (6.1 - y0 - ch) * 0.45);
    s.items.forEach((it, i) => {
      const x = x0 + i * (cw + gap);
      rect(slide, x, cy, cw, ch, { line: COLOR.rose, lw: 1, radius: 0.18, name: "框" });
      text(slide, it.value, { x: x + 0.2, y: cy + 0.35, w: cw - 0.4, h: 0.95, fontSize: vSize, color: i % 2 ? COLOR.orange : COLOR.rose, fontFace: FONT.head, align: "center", valign: "middle", noBalance: true });
      line(slide, x + cw / 2 - 0.25, cy + 1.42, 0.5, 0, COLOR.roseD, 0.75);
      text(slide, it.label, { x: x + 0.25, y: cy + 1.6, w: cw - 0.5, h: lH, fontSize: 13, align: "center" });
    });
    sourceLine(slide, s, 0.8, cy + ch + 0.35, 11.73, "center");
  } else { // chart
    const X = 0.8, W = 4.5, n = s.items.length;
    const step = n > 3 ? 0.95 : 1.1;
    let y = y0 + 0.1;
    const vSize = Math.min(...s.items.map((it) => oneLine(it.value, { w: 1.6, max: 30, min: 16 })));
    s.items.forEach((it, i) => {
      diamond(slide, X + 0.07, y + step / 2 - 0.05, 0.12, SERIES[i]);
      text(slide, it.value, { x: X + 0.3, y, w: 1.9, h: step - 0.1, fontSize: vSize, color: i % 2 ? COLOR.orange : COLOR.rose, fontFace: FONT.head, valign: "middle", noBalance: true });
      text(slide, it.label, { x: X + 2.3, y, w: W - 2.3, h: step - 0.1, fontSize: 12.5, valign: "middle" });
      y += step;
    });
    sourceLine(slide, s, X, Math.max(y + 0.15, 5.9), W);
    const bx = 5.9, bw = 6.6, bh = 6.85 - y0;
    rect(slide, bx, y0, bw, bh, { line: COLOR.roseD, lw: 0.75, name: "图表框" });
    const d = data || { labels: s.items.map((i) => i.label), values: s.items.map(() => 0) };
    const max = Math.max(...d.values);
    slide.addChart(ctx.charts.BAR, [{ name: s.chart?.unit || "数值", labels: d.labels, values: d.values }], {
      x: bx + 0.3, y: y0 + 0.25, w: bw - 0.6, h: bh - 0.5, barDir: "col", barGapWidthPct: 90,
      chartColors: SERIES.slice(0, d.values.length),
      showTitle: !!s.chart?.title, title: s.chart?.title || "", titleColor: COLOR.body, titleFontSize: 13, titleFontFace: FONT.body,
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: COLOR.body, dataLabelFontSize: 13, dataLabelFontFace: FONT.body,
      catAxisLabelColor: COLOR.sub, catAxisLabelFontSize: 11, catAxisLabelFontFace: FONT.body, catAxisLineShow: true, catAxisLineColor: COLOR.roseD,
      valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: max > 0 ? max * 1.18 : 1,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false,
      altText: `柱状图：${d.labels.map((l, i) => `${l} ${d.values[i]}`).join("、")}`,
    });
  }
}

/* ---------- Timeline ---------- */
async function timeline(s) {
  ctx.pickLayout(s, ["scroll"]);
  const slide = add(s);
  const y0 = top(slide, s);
  const bottom = s.conclusion ? 6.0 : 6.75;
  const n = s.items.length, cw = Math.min(2.6, 11.73 / n - 0.2), x1 = 0.8 + cw / 2, x2 = CW - 0.8 - cw / 2, sp = (x2 - x1) / (n - 1);
  const tSize = Math.min(...s.items.map((it) => oneLine(it.time, { w: cw, max: 20, min: 13 })));
  const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw, max: 17, min: 13 })));
  const bodyH = Math.max(0, ...s.items.map((it) => (it.body ? H(it.body, { w: cw, fontSize: 12 }) : 0)));
  const need = 0.55 + 0.25 + 0.3 + 0.48 + (bodyH ? 0.1 + bodyH : 0);
  const lineY = y0 + 0.55 + 0.25 + Math.max(0, (bottom - y0 - need) * 0.45);
  line(slide, 0.8, lineY, 11.73, 0, COLOR.rose, 0.75);
  diamond(slide, 0.8, lineY, 0.12); diamond(slide, 12.53, lineY, 0.12);
  s.items.forEach((it, i) => {
    const cx = x1 + i * sp;
    text(slide, it.time, { x: cx - cw / 2, y: lineY - 0.25 - 0.55, w: cw, h: 0.55, fontSize: tSize, color: COLOR.rose, fontFace: FONT.head, align: "center", valign: "middle", noBalance: true });
    diamond(slide, cx, lineY, 0.2, i === n - 1 ? COLOR.orange : COLOR.rose);
    head(slide, it.head, { x: cx - cw / 2, y: lineY + 0.3, w: cw, h: 0.48, fontSize: hSize, color: COLOR.white, align: "center" });
    if (it.body) text(slide, it.body, { x: cx - cw / 2, y: lineY + 0.88, w: cw, h: H(it.body, { w: cw, fontSize: 12 }), fontSize: 12, align: "center" });
  });
  conclusionLine(slide, s.conclusion, 6.2);
}

/* ---------- Large image with text ---------- */
function textColumn(slide, s, X, W, y0, yMax, align = "left") {
  let size = 13;
  const need = (sz) => H(s.body, { w: W, fontSize: sz }) + (s.points || []).reduce((a, p) => a + H(p, { w: W - 0.35, fontSize: sz }) + 0.14, 0) + (s.conclusion ? H(s.conclusion, { w: W, fontSize: 15 }) + 0.45 : 0) + 0.3;
  while (size > 11 && need(size) > yMax - y0) size -= 0.5;
  let y = y0 + Math.max(0, (yMax - y0 - need(size)) * 0.35);
  const bh = H(s.body, { w: W, fontSize: size });
  text(slide, s.body, { x: X, y, w: W, h: bh, fontSize: size, align });
  y += bh + 0.3;
  for (const p of s.points || []) {
    const ph = H(p, { w: W - 0.35, fontSize: size });
    diamond(slide, X + 0.08, y + size / 72 * 0.65, 0.1);
    text(slide, p, { x: X + 0.35, y, w: W - 0.35, h: ph, fontSize: size, color: COLOR.body });
    y += ph + 0.14;
  }
  if (s.conclusion) {
    y += 0.15;
    line(slide, X, y, 0.6, 0, COLOR.rose, 1);
    const ch = H(s.conclusion, { w: W, fontSize: 15 });
    text(slide, s.conclusion, { x: X, y: y + 0.15, w: W, h: ch, fontSize: 15, color: COLOR.rose });
  }
}
async function imageText(s) {
  const layout = ctx.pickLayout(s, ["strips", "half"]);
  const slide = add(s);
  if (layout === "strips") {
    header(slide, s);
    const hs = [2.5, 2.75, 3.0, 2.75, 2.5], sw = 1.45, gap = 0.22, x0 = CX - (5 * sw + 4 * gap) / 2, base = 4.55;
    line(slide, 0.8, 3.05, 11.73, 0, COLOR.roseD, 0.75);
    diamond(slide, 0.8, 3.05, 0.13); diamond(slide, 12.53, 3.05, 0.13);
    for (let i = 0; i < 5; i++) {
      await ctx.pic(slide, s, i, x0 + i * (sw + gap), base - hs[i], sw, hs[i], { fallback: `strip${i + 1}.jpg` });
    }
    // text below, centered
    const W = 10.6, X = CX - W / 2;
    let size = 13;
    const pts = s.points || [];
    const pw = pts.length ? (W - (pts.length - 1) * 0.3) / pts.length : 0;
    const need = (sz) => H(s.body, { w: W, fontSize: sz }) + (pts.length ? Math.max(...pts.map((p) => H(p, { w: pw - 0.3, fontSize: sz }))) + 0.2 : 0) + (s.conclusion ? H(s.conclusion, { w: W, fontSize: 15 }) + 0.2 : 0);
    while (size > 11 && need(size) > 6.95 - 4.8) size -= 0.5;
    let y = 4.8 + Math.max(0, (6.95 - 4.8 - need(size)) * 0.3);
    const bh = H(s.body, { w: W, fontSize: size });
    text(slide, s.body, { x: X, y, w: W, h: bh, fontSize: size, align: "center" });
    y += bh + 0.2;
    if (pts.length) {
      const ph = Math.max(...pts.map((p) => H(p, { w: pw - 0.3, fontSize: size })));
      pts.forEach((p, i) => {
        const px = X + i * (pw + 0.3);
        diamond(slide, px + 0.08, y + size / 72 * 0.65, 0.1);
        text(slide, p, { x: px + 0.3, y, w: pw - 0.3, h: ph, fontSize: size, color: COLOR.rose });
      });
      y += ph + 0.2;
    }
    if (s.conclusion) text(slide, s.conclusion, { x: X, y, w: W, h: H(s.conclusion, { w: W, fontSize: 15 }), fontSize: 15, color: COLOR.rose, align: "center" });
  } else { // half
    await ctx.pic(slide, s, 0, 0, 0, 6.6, 7.5, { fallback: "photo_dish.jpg" });
    deco(slide, "fade_r.png", 3.35, 0, 3.3, 7.5, "渐隐装饰static");
    const X = 7.1, W = 5.45;
    const size = oneLine(s.title, { w: W, max: 28, min: 20 });
    const tH = H(s.title, { w: W, fontSize: size, lineSpacingMultiple: 1.1 });
    head(slide, s.title, { x: X, y: 0.75, w: W, h: tH, fontSize: size });
    line(slide, X, 0.85 + tH + 0.05, W, 0, COLOR.roseD, 0.75);
    diamond(slide, X, 0.85 + tH + 0.05, 0.12);
    const label = s.eyebrow !== undefined ? s.eyebrow : (s._sectionNo ? `${CN[(s._sectionNo - 1) % 10]} · ${s._sectionTitle}` : "");
    if (label) text(slide, label, { x: X, y: 0.35, w: W, h: 0.35, fontSize: oneLine(label, { w: W, max: 12, min: 10 }), color: COLOR.sub, valign: "middle", noBalance: true });
    textColumn(slide, s, X, W, 0.85 + tH + 0.4, 6.95);
  }
}

/* ---------- Pull quote ---------- */
function seal(slide, str, cx, y) {
  const size = oneLine(str, { w: 5.0, max: 13, min: 10, charSpacing: 1 });
  const w = Math.min(5.4, longest(str, { fontSize: size, charSpacing: 1 }) + 0.5);
  rect(slide, cx - w / 2, y, w, 0.4, { fill: COLOR.red, name: "印章" });
  text(slide, str, { x: cx - w / 2 + 0.1, y, w: w - 0.2, h: 0.4, fontSize: size, charSpacing: 1, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
}
async function quote(s) {
  const layout = ctx.pickLayout(s, ["frames", "dragon"]);
  const slide = add(s);
  if (layout === "frames") {
    line(slide, 0, 0.84, CW, 0, COLOR.roseD, 0.75);
    await framedPic(slide, s, 0, 0.8, 2.3, 2.9, 4.4, "photo_hanfu.jpg", { offset: -0.12 });
    await framedPic(slide, s, 1, CW - 0.8 - 2.9, 2.3, 2.9, 4.4, "photo_type.jpg", { offset: 0.12 });
    const W = 5.3;
    const size = FIT(s.text, { w: W, h: 2.4, max: 32, min: 22, lineSpacingMultiple: 1.3 });
    const qt = evenBreak(s.text, { w: W, fontSize: size });
    const h = H(qt, { w: W, fontSize: size, lineSpacingMultiple: 1.3 });
    const y = Math.max(2.2, 3.9 - h / 2 - 0.3);
    text(slide, qt, { x: CX - W / 2, y, w: W, h, fontSize: size, color: COLOR.rose, fontFace: FONT.head, align: "center", lineSpacingMultiple: 1.3, noBalance: true });
    divider(slide, CX, y + h + 0.3, 3.6);
    if (s.author) seal(slide, s.author, CX, y + h + 0.6);
  } else { // dragon
    deco(slide, "calligraphy.jpg", 0, 0, CW, 7.5, "书法纹理装饰static");
    deco(slide, "dragon.jpg", CX - 4.35, 7.5 - 3.22, 8.7, 3.22, "龙纹装饰static");
    const W = 8.6;
    const size = FIT(s.text, { w: W, h: 2.2, max: 36, min: 24, lineSpacingMultiple: 1.3 });
    const qt = evenBreak(s.text, { w: W, fontSize: size });
    const h = H(qt, { w: W, fontSize: size, lineSpacingMultiple: 1.3 });
    const y = Math.max(0.9, 2.5 - h / 2);
    text(slide, qt, { x: CX - W / 2, y, w: W, h, fontSize: size, color: COLOR.rose, fontFace: FONT.head, align: "center", lineSpacingMultiple: 1.3, noBalance: true });
    divider(slide, CX, y + h + 0.3, 4.0);
    if (s.author) seal(slide, s.author, CX, y + h + 0.58);
  }
}

/* ---------- Table (optional type) ---------- */
async function table(s) {
  ctx.pickLayout(s, ["ledger"]);
  const slide = add(s);
  const y0 = top(slide, s);
  const rows = s.rows || [], cols = s.columns || [];
  const rowH = rows.length > 4 ? 0.62 : 0.7, headH = 0.55, tw = 11.73;
  const b = (pt, c) => ({ type: "solid", pt, color: c }), n = { type: "none" };
  const Hd = (t) => ({ text: t, options: { fontSize: 13.5, color: COLOR.ink, fill: { color: COLOR.rose }, border: [n, n, n, n] } });
  const Cl = (t, j) => ({ text: t ?? "", options: { color: j === 0 ? COLOR.rose : COLOR.body, border: [n, n, b(0.75, COLOR.roseD), n] } });
  const len = (t) => [...String(t ?? "")].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2000 ? 0.55 : 1), 0);
  const weight = cols.map((c, j) => Math.max(2, len(c), ...rows.map((r) => len(r[j]))));
  let colW = weight.map((w) => (tw * w) / weight.reduce((a, c) => a + c, 0));
  const short = colW.map((w) => Math.max(1.2, w)), extra = short.reduce((a, c) => a + c, 0) - tw;
  if (extra > 0) { const wide = short.map((w, j) => (colW[j] > 1.2 ? w : 0)), sum = wide.reduce((a, c) => a + c, 0); colW = short.map((w, j) => (wide[j] ? w - (extra * w) / sum : w)); }
  slide.addTable([cols.map(Hd), ...rows.map((r) => cols.map((_, j) => Cl(r[j], j)))], {
    x: 0.8, y: y0 + 0.05, w: tw, colW, rowH: [headH, ...rows.map(() => rowH)],
    fontSize: 12.5, color: COLOR.body, fontFace: FONT.body, margin: [0.04, 0.14, 0.04, 0.14], valign: "middle",
  });
  if (s.conclusion) {
    const y = y0 + 0.05 + headH + rows.length * rowH + 0.3;
    line(slide, 0.8, y, 0.6, 0, COLOR.rose, 1);
    conclusionLine(slide, s.conclusion, y + 0.15, { align: "left" });
  }
}

/* ---------- Steps (optional type) ---------- */
async function steps(s) {
  ctx.pickLayout(s, ["numerals"]);
  const slide = add(s);
  const y0 = top(slide, s, { minTop: 1.75 });
  const n = s.items.length, X0 = 0.8, cw = 11.73 / n;
  const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw - 0.5, max: 18, min: 13 })));
  const bodyH = Math.max(...s.items.map((it) => H(it.body, { w: cw - 0.6, fontSize: 12.5 })));
  const total = 1.1 + 0.35 + 0.25 + 0.5 + 0.12 + bodyH;
  const ty = y0 + Math.max(0, (6.85 - y0 - total) * 0.4);
  for (let i = 0; i < n; i++) {
    const it = s.items[i], cx = X0 + cw * (i + 0.5);
    text(slide, CN[i % 10], { x: cx - 0.7, y: ty, w: 1.4, h: 1.1, fontSize: 60, color: COLOR.rose, fontFace: FONT.head, align: "center", valign: "middle", lineSpacingMultiple: 1.0, noBalance: true });
    if (i < n - 1) { line(slide, cx + 0.75, ty + 0.55, cw - 1.5, 0, COLOR.roseD, 0.75); diamond(slide, cx + cw / 2, ty + 0.55, 0.1); }
    text(slide, `STEP ${num2(i)}`, { x: cx - 1, y: ty + 1.1, w: 2, h: 0.35, fontSize: 10, charSpacing: 3, color: COLOR.sub, align: "center", valign: "middle", noBalance: true });
    line(slide, cx - 0.25, ty + 1.55, 0.5, 0, COLOR.rose, 1);
    head(slide, it.head, { x: cx - (cw - 0.5) / 2, y: ty + 1.7, w: cw - 0.5, h: 0.5, fontSize: hSize, color: COLOR.white, align: "center" });
    text(slide, it.body, { x: cx - (cw - 0.6) / 2, y: ty + 2.32, w: cw - 0.6, h: bodyH, fontSize: 12.5, align: "center" });
  }
}

/* ============================ Entry point ============================ */
async function render(deck, c) {
  ctx = c;
  ctx.pres.defineSlideMaster({ title: "IH_BLACK", background: { color: COLOR.bg }, objects: [] });
  await ctx.renderAll({ cover, toc, section, points3, points4, compare, stats, timeline, imageText, quote, closing, table, steps });
}

module.exports = { render };
