/**
 * Template: Party Red (party-red)
 * ------------------------------------------------------------------
 * Visual source: the web template "210 红色 · 简洁蓝白大气风工作汇报" (blue sky + sea of clouds, red silk ribbons, white doves,
 * blue calligraphy titles, red accents). Backgrounds and ribbons were cut out of the original with tools/pptx_extract.py
 * (bg_*.jpg, ribbon_*.png, orbit_rings / hub_ring / book / flag / dove .png); cards, tags, bands and lines are drawn here.
 *
 * Fonts: big titles use 楷体 (KaiTi, ships with Windows) to keep the calligraphic feel of the original
 * (the original used 汉仪许静行楷W, which most computers don't have); everything else uses 微软雅黑.
 *
 * Layout list (keep in sync with meta.json → layouts):
 *   cover     hero                     sky + ribbons + doves; big blue title (two staggered lines when long), subtitle in a cut-corner frame
 *   toc       cards                    "目录" + translucent white cards (3–8, two rows when > 4)
 *   section   clouds | curtain         centered title on the sky / red curtain page with cream text (from the original "前言" page)
 *   points3   orbit | cards | banners  round image in red rings + 3 items on an arc / 3 white cards with red numbers / 3 pennant banners with stars
 *   points4   ribbon | flags           vertical red ribbon in the middle, 2 items per side / 2×2 cards with red flag numbers
 *   compare   redBand | hub            red band (lead) + two cards / round image in a red hub + pill items on both sides
 *   stats     cards | chart            big red numbers in cards / number list + bar chart
 *   timeline  tags                     red line + red time tags + nodes
 *   imageText triptych | frame         text left + three tall photo strips right / framed photo left + text right
 *   quote     book | sky               quote on an open book / centered quote on the sky
 *   closing   thanks                   same staging as the cover
 *   table     panel        (optional)  white panel + red header row
 *   steps     flags        (optional)  step cards with red flags + chevrons
 */
const COLOR = {
  blue: "2E75B6", blueD: "1F4E79", blueL: "5B9BD5", red: "D02227", redD: "A8161B", redL: "FBE9E9",
  cream: "FEE2B2", creamL: "FFF3DA", ink: "404040", gray: "6B6B6B", white: "FFFFFF",
};
const FONT = { title: "楷体", head: "微软雅黑", body: "微软雅黑" };
const BG = { content: "F2F2F3", sky: "E4E5E6", red: "BB2F33" };
const CW = 13.333, CX = CW / 2;

/* ---------------- Typesetting components ---------------- */
let ctx;
function text(slide, str, o) {
  if (str === undefined || str === null || str === "") return 0;
  const opt = { isTextBox: true, margin: 0, color: COLOR.ink, fontFace: FONT.body, fontSize: 13, valign: "top", lineSpacingMultiple: 1.25, ...o };
  const s = o.noBalance ? String(str) : ctx.balance(String(str), { w: opt.w, fontSize: opt.fontSize, bold: opt.bold, charSpacing: opt.charSpacing, lineSpacingMultiple: opt.lineSpacingMultiple });
  delete opt.noBalance;
  slide.addText(s, opt);
  return opt.h;
}
const head = (slide, str, o) => text(slide, str, { fontFace: FONT.head, bold: true, valign: "middle", lineSpacingMultiple: 1.1, ...o });
const cal = (slide, str, o) => text(slide, str, { fontFace: FONT.title, bold: true, valign: "middle", lineSpacingMultiple: 1.05, color: COLOR.blue, noBalance: true, ...o });
const oneLine = (str, o) => ctx.fitLine(String(str || ""), o);
const H = (str, o) => (str ? ctx.measure(String(str), { lineSpacingMultiple: 1.25, ...o }).needH + 0.04 : 0);
const FIT = (str, o) => ctx.fit(String(str || ""), { lineSpacingMultiple: 1.1, bold: true, ...o });
const longest = (str, o) => ctx.measure(String(str || ""), { w: 40, ...o }).longest || 0;
const num2 = (i) => String(i + 1).padStart(2, "0");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Break a multi-line title into near-equal lines (prefer breaking after punctuation) so no line is left with 1–2 chars */
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
function line(slide, x, y, w, h, color = COLOR.red, width = 1, o = {}) {
  slide.addShape(ctx.shapes.LINE, { x, y, w, h, line: { color, width, ...o }, objectName: "线条装饰static" });
}
function bar(slide, x, y, w, h, color = COLOR.red, name = "色条") {
  slide.addShape(ctx.shapes.RECTANGLE, { x, y, w, h, fill: { color }, line: { type: "none" }, objectName: name });
}
/** White card with a thin red border (the original's 90%-opaque white rounded cards) */
function card(slide, x, y, w, h, o = {}) {
  slide.addShape(o.shape || ctx.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: o.radius ?? 0.1, fill: { color: o.fill || COLOR.white, transparency: o.tr ?? 10 },
    line: o.noLine ? { type: "none" } : { color: o.line || COLOR.red, width: o.lw || 1 }, objectName: o.name || "卡片",
  });
}
function dot(slide, x, y, d = 0.2, o = {}) {
  slide.addShape(ctx.shapes.OVAL, { x, y, w: d, h: d, fill: o.fill ? { color: o.fill } : { color: COLOR.white }, line: { color: o.line || COLOR.red, width: o.lw || 1.5 }, objectName: "圆点装饰static" });
}
async function iconImg(slide, name, color, x, y, s, def) {
  slide.addImage({ data: await ctx.icon(name, color, def), x, y, w: s, h: s, objectName: "图标static" });
}
/** Red rounded tag with white text (+ optional pointer below) */
function redTag(slide, str, cx, y, { w, h = 0.46, size, pointer = false, maxW = 3 } = {}) {
  const fs = size || oneLine(str, { w: maxW - 0.3, max: 16, min: 11, bold: true });
  const tw = w || clamp(longest(str, { fontSize: fs, bold: true }) + 0.42, 0.9, maxW);
  slide.addShape(ctx.shapes.ROUNDED_RECTANGLE, { x: cx - tw / 2, y, w: tw, h, rectRadius: 0.07, fill: { color: COLOR.red }, line: { type: "none" }, objectName: "标签" });
  if (pointer) slide.addShape(ctx.shapes.ISOSCELES_TRIANGLE, { x: cx - 0.11, y: y + h - 0.01, w: 0.22, h: 0.13, rotate: 180, fill: { color: COLOR.red }, line: { type: "none" }, objectName: "标签尖角装饰static" });
  text(slide, str, { x: cx - tw / 2 + 0.1, y, w: tw - 0.2, h, fontSize: fs, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true, fontFace: FONT.head });
  return tw;
}
/** Outlined keyword pills, wrapped and aligned */
function pills(slide, kws, X, y, W, { align = "center", color = COLOR.red, fill = COLOR.white, tr = 20, size = 13 } = {}) {
  if (!kws?.length) return y;
  const pad = 0.44, gap = 0.16, h = 0.42;
  const ws = kws.map((k) => longest(k, { fontSize: size, bold: true }) + pad);
  const rows = [[]]; let acc = 0;
  ws.forEach((w, i) => { if (acc + w > W && rows[rows.length - 1].length) { rows.push([]); acc = 0; } rows[rows.length - 1].push(i); acc += w + gap; });
  for (const row of rows) {
    const rw = row.reduce((a, i) => a + ws[i], 0) + (row.length - 1) * gap;
    let x = align === "center" ? X + (W - rw) / 2 : X;
    for (const i of row) {
      slide.addShape(ctx.shapes.ROUNDED_RECTANGLE, { x, y, w: ws[i], h, rectRadius: h / 2, fill: fill ? { color: fill, transparency: tr } : { type: "none" }, line: { color, width: 1 }, objectName: "标签" });
      text(slide, kws[i], { x, y, w: ws[i], h, fontSize: size, bold: true, color, align: "center", valign: "middle", noBalance: true });
      x += ws[i] + gap;
    }
    y += h + 0.14;
  }
  return y - 0.14;
}
const pillRows = (kws, W, size = 13) => {
  if (!kws?.length) return 0;
  let rows = 1, acc = 0;
  kws.forEach((k) => { const w = longest(k, { fontSize: size, bold: true }) + 0.44; if (acc + w > W && acc > 0) { rows++; acc = 0; } acc += w + 0.16; });
  return rows;
};

/* ---------- Pages and backgrounds ---------- */
function add(s, kind = "content") {
  const master = { content: "PR_CONTENT", cover: "PR_COVER", section: "PR_SECTION", toc: "PR_TOC", closing: "PR_CLOSING", red: "PR_RED" }[kind];
  const bg = kind === "content" ? BG.content : kind === "red" ? BG.red : BG.sky;
  return ctx.addSlide(s, { master, bg });
}
/** Content-page header: blue calligraphy title (next to the corner ribbon) + short red bar + eyebrow on the right */
function header(slide, s, o = {}) {
  let label = s.eyebrow !== undefined ? s.eyebrow : (s._sectionNo ? `${s._num} · ${s._sectionTitle}` : "");
  const X = 1.1, lw = 3.1;
  let tw = o.titleW ?? (label ? 8.3 : 11.3);
  const size = oneLine(s.title, { w: tw, max: o.max || 34, min: 24, bold: true });
  cal(slide, s.title, { x: X, y: 0.4, w: tw, h: 0.78, fontSize: size });
  bar(slide, X + 0.03, 1.2, 0.62, 0.05, COLOR.red, "线条装饰static");
  if (label) {
    const ls = oneLine(label, { w: lw, max: 13, min: 10, bold: true });
    text(slide, label, { x: CW - 0.88 - lw, y: 0.62, w: lw, h: 0.36, fontSize: ls, bold: true, color: COLOR.blueD, align: "right", valign: "middle", noBalance: true });
    line(slide, CW - 0.88 - Math.min(lw, longest(label, { fontSize: ls, bold: true })), 1.02, Math.min(lw, longest(label, { fontSize: ls, bold: true })), 0, COLOR.red, 1);
  }
  return 1.3;
}
/** Standard top of a content page: header + lead; returns where the body starts */
function top(slide, s, o = {}) {
  const after = header(slide, s, o);
  if (!s.lead) return Math.max(after + 0.3, o.minTop ?? 1.7);
  const w = o.leadW ?? 11.2, size = 13;
  const h = H(s.lead, { w, fontSize: size });
  text(slide, s.lead, { x: 1.1, y: after + 0.12, w, h, fontSize: size, color: COLOR.ink });
  return Math.max(after + 0.12 + h + 0.25, o.minTop ?? 1.7);
}
/** Conclusion line: blue bold, centered */
function conclusionLine(slide, str, y, { x = 1.2, w = 10.93, size = 16, pill = false } = {}) {
  if (!str) return;
  const fs = oneLine(str, { w: w - (pill ? 0.6 : 0), max: size, min: 12, bold: true });
  if (pill) {
    const pw = Math.min(w, longest(str, { fontSize: fs, bold: true }) + 0.9);
    card(slide, CX - pw / 2, y, pw, 0.5, { radius: 0.25, tr: 12, line: COLOR.blue, lw: 0.75, name: "结论底" });
    text(slide, str, { x: CX - pw / 2 + 0.3, y, w: pw - 0.6, h: 0.5, fontSize: fs, bold: true, color: COLOR.blueD, align: "center", valign: "middle", noBalance: true });
  } else text(slide, str, { x, y, w, h: 0.46, fontSize: fs, bold: true, color: COLOR.blueD, align: "center", valign: "middle", noBalance: true });
}

/* ---------- Title staging shared by cover / closing ---------- */
/** Split a title at the punctuation mark (or space) nearest the middle; the mark stays on the first line */
function splitAtPunct(str) {
  const chars = [...String(str)], n = chars.length;
  let best = -1, bd = Infinity;
  chars.forEach((ch, i) => {
    if (/[：:，,、；;！!？?|｜—\s]/.test(ch) && i + 1 >= n * 0.25 && i + 1 <= n * 0.75 && i < n - 1) {
      const d = Math.abs(i + 1 - n / 2);
      if (d < bd) { bd = d; best = i; }
    }
  });
  if (best < 0) return null;
  const a = chars.slice(0, best + 1).join("").trim(), b = chars.slice(best + 1).join("").trim();
  return a && b ? [a, b] : null;
}
/** Big calligraphy title lines + size: one line when it fits big, else two lines (split at punctuation when possible) */
function titleLines(str, W) {
  str = String(str);
  const one = oneLine(str, { w: W, max: 100, min: 62, bold: true });
  if (ctx.measure(str, { w: W, fontSize: one, bold: true }).lines === 1) return { size: one, lines: [str] };
  const lw = W * 0.8, parts = splitAtPunct(str);
  if (parts) {
    const size = Math.min(...parts.map((p) => oneLine(p, { w: lw, max: 92, min: 44, bold: true })));
    if (parts.every((p) => ctx.measure(p, { w: lw, fontSize: size, bold: true }).lines === 1)) return { size, lines: parts };
  }
  const size = FIT(str, { w: lw, h: 3.0, max: 92, min: 50, lineSpacingMultiple: 1.0 });
  return { size, lines: evenBreak(str, { w: lw, fontSize: size, bold: true }).split("\n") };
}
const linesH = (lines, size) => lines.length * (size / 72) * 1.2 * 1.02 + 0.04;
/** Big calligraphy title: one centered line, or two staggered lines (first left, second right) like the original cover */
function bigTitle(slide, lines, y, { W = 10.4, size }) {
  const X = CX - W / 2, lw = W * 0.8;
  if (lines.length === 2) {
    const lh = H(lines[0], { w: lw, fontSize: size, bold: true, lineSpacingMultiple: 1.0 });
    cal(slide, lines[0], { x: X, y, w: lw, h: lh, fontSize: size, align: "left", lineSpacingMultiple: 1.0 });
    cal(slide, lines[1], { x: X + W - lw, y: y + lh, w: lw, h: lh, fontSize: size, align: "right", lineSpacingMultiple: 1.0 });
    return lh * 2;
  }
  const t = lines.join("\n");
  const h = H(t, { w: W, fontSize: size, bold: true, lineSpacingMultiple: 1.05 });
  cal(slide, t, { x: X, y, w: W, h, fontSize: size, align: "center" });
  return h;
}
/** Cut-corner frame with side lines (the original's subtitle bar) */
function snipFrame(slide, str, y, { maxW = 8.4, size: sz } = {}) {
  const size = sz || oneLine(str, { w: maxW - 0.7, max: 20, min: 13 });
  const fw = clamp(longest(str, { fontSize: size }) + 1.0, 5.6, maxW);
  slide.addShape(ctx.shapes.SNIP_2_DIAG_RECTANGLE, { x: CX - fw / 2, y, w: fw, h: 0.56, fill: { color: COLOR.white, transparency: 15 }, line: { color: COLOR.blue, width: 0.75 }, objectName: "副标题框" });
  text(slide, str, { x: CX - fw / 2 + 0.35, y, w: fw - 0.7, h: 0.56, fontSize: size, color: COLOR.blue, align: "center", valign: "middle", noBalance: true });
  const ll = Math.min(1.26, (CW - fw) / 2 - 0.25 - 0.9);
  if (ll > 0.3) {
    line(slide, CX - fw / 2 - 0.25 - ll, y + 0.28, ll, 0, COLOR.red, 1.25);
    line(slide, CX + fw / 2 + 0.25, y + 0.28, ll, 0, COLOR.red, 1.25);
  }
}

/* ============================ Page types ============================ */

async function cover(s) {
  ctx.pickLayout(s, ["hero"]);
  const slide = add(s, "cover");
  const W = 10.4;
  let { size, lines } = titleLines(s.title, W);
  const rest = (s.subtitle ? 0.45 + 0.56 : 0) + (s.desc ? 0.3 + H(s.desc, { w: 8.6, fontSize: 14 }) : 0) + (s.tag ? 0.3 + 0.4 : 0);
  while (size > 44 && linesH(lines, size) + rest > 5.6) size -= 2;
  const total = linesH(lines, size) + rest;
  let y = 0.95 + Math.max(0, (5.75 - total) * 0.42);
  y += bigTitle(slide, lines, y, { W, size });
  if (s.subtitle) { y += 0.45; snipFrame(slide, s.subtitle, y); y += 0.56; }
  if (s.desc) { y += 0.3; const h = H(s.desc, { w: 8.6, fontSize: 14 }); text(slide, s.desc, { x: CX - 4.3, y, w: 8.6, h, fontSize: 14, color: COLOR.ink, align: "center" }); y += h; }
  if (s.tag) {
    y += 0.3;
    const ts = oneLine(s.tag, { w: 5.0, max: 16, min: 12, bold: true });
    text(slide, s.tag, { x: CX - 2.6, y, w: 5.2, h: 0.4, fontSize: ts, bold: true, color: COLOR.blueD, align: "center", valign: "middle", noBalance: true });
  }
}

async function toc(s) {
  ctx.pickLayout(s, ["cards"]);
  const slide = add(s, "toc");
  const tt = s.title || "目录";
  cal(slide, tt, { x: CX - 3.5, y: 0.42, w: 7, h: 1.2, fontSize: oneLine(tt, { w: 7, max: 66, min: 40, bold: true }), align: "center" });
  const items = s.items || [], n = items.length;
  const rows = n <= 4 ? 1 : 2, cols = rows === 1 ? n : Math.ceil(n / 2);
  const X = 0.92, W = 11.5, gap = 0.28, cw = (W - (cols - 1) * gap) / cols;
  const topY = rows === 1 ? 1.95 : 1.78, bottom = s.desc ? 5.9 : 6.7;
  const ch = rows === 1 ? Math.min(3.8, bottom - topY) : (bottom - topY - gap) / 2;
  const y0 = rows === 1 ? topY + (bottom - topY - ch) / 2 : topY;
  const numH = rows === 1 ? 0.95 : 0.56, numS = rows === 1 ? 54 : 34, hH = rows === 1 ? 0.5 : 0.46, g1 = rows === 1 ? 0.14 : 0.11;
  const hSize = Math.min(...items.map((it) => oneLine(it.head, { w: cw - 0.3, max: rows === 1 ? 22 : 19, min: 13, bold: true })));
  const subH = Math.max(0, ...items.map((it) => (it.sub ? H(it.sub, { w: cw - 0.3, fontSize: 12 }) : 0)));
  for (let i = 0; i < n; i++) {
    const it = items[i], c = i % cols, r = Math.floor(i / cols);
    const x = X + c * (cw + gap), y = y0 + r * (ch + gap);
    card(slide, x, y, cw, ch, { tr: 22, line: COLOR.white, lw: 1.25, radius: 0.05, name: "目录卡片" });
    const inner = numH + 0.06 + hH + g1 + 0.05 + (subH ? g1 + subH : 0);
    let yy = y + Math.max(0.08, (ch - inner) / 2);
    cal(slide, num2(i), { x, y: yy, w: cw, h: numH, fontSize: numS, align: "center" });
    yy += numH + 0.06;
    head(slide, it.head, { x: x + 0.15, y: yy, w: cw - 0.3, h: hH, fontSize: hSize, color: COLOR.blue, align: "center" });
    yy += hH + g1;
    bar(slide, x + cw / 2 - 0.23, yy, 0.46, 0.05, COLOR.blue, "线条装饰static");
    yy += 0.05 + g1;
    if (it.sub) text(slide, it.sub, { x: x + 0.15, y: yy, w: cw - 0.3, h: H(it.sub, { w: cw - 0.3, fontSize: 12 }), fontSize: 12, color: COLOR.ink, align: "center" });
  }
  if (s.desc) text(slide, s.desc, { x: 1.4, y: 6.08, w: 10.53, h: H(s.desc, { w: 10.53, fontSize: 13 }), fontSize: 13, color: COLOR.blueD, align: "center" });
}

/* ---------- Section page ---------- */
async function section(s) {
  const layout = ctx.pickLayout(s, ["clouds", "curtain"]);
  const no = String(s._sectionNo || 1).padStart(2, "0");
  const label = s._part || `PART ${no}`;
  if (layout === "clouds") {
    const slide = add(s, "section");
    const W = 8.3, X = CX - W / 2;
    let size = FIT(s.title, { w: W, h: 2.3, max: 88, min: 48, lineSpacingMultiple: 1.05 });
    const one = oneLine(s.title, { w: W, max: 88, min: 60, bold: true });
    if (ctx.measure(s.title, { w: W, fontSize: one, bold: true }).lines === 1) size = one;
    const title = evenBreak(s.title, { w: W, fontSize: size, bold: true });
    const tH = H(title, { w: W, fontSize: size, bold: true, lineSpacingMultiple: 1.05 });
    const dH = H(s.desc, { w: 8.0, fontSize: 16 });
    const kwR = pillRows(s.keywords, W);
    const total = 0.44 + 0.3 + tH + (s.en ? 0.45 : 0) + 0.3 + (dH ? dH + 0.2 : 0) + (kwR ? kwR * 0.56 + 0.15 : 0);
    let y = Math.max(0.9, 3.65 - total / 2);
    redTag(slide, label, CX, y, { size: 14, h: 0.44, w: 1.9 });
    y += 0.44 + 0.3;
    cal(slide, title, { x: X, y, w: W, h: tH, fontSize: size, align: "center" });
    y += tH;
    if (s.en) { const t = s.en.toUpperCase(); text(slide, t, { x: X, y: y + 0.05, w: W, h: 0.36, fontSize: oneLine(t, { w: W, max: 15, min: 10, bold: true, charSpacing: 3 }), bold: true, charSpacing: 3, color: COLOR.blue, align: "center", valign: "middle", noBalance: true }); y += 0.45; }
    bar(slide, CX - 0.6, y + 0.12, 1.2, 0.05, COLOR.red, "线条装饰static");
    y += 0.3;
    if (s.desc) { text(slide, s.desc, { x: CX - 4.0, y, w: 8.0, h: dH, fontSize: 16, color: COLOR.blueD, align: "center" }); y += dH + 0.2; }
    if (kwR) pills(slide, s.keywords, X, y, W);
  } else { // curtain
    const slide = add(s, "red");
    const X = 1.0, W = 6.6;
    const size = (() => { const one = oneLine(s.title, { w: W, max: 66, min: 44, bold: true }); return ctx.measure(s.title, { w: W, fontSize: one, bold: true }).lines === 1 ? one : FIT(s.title, { w: W, h: 2.0, max: 60, min: 40, lineSpacingMultiple: 1.05 }); })();
    const title = evenBreak(s.title, { w: W, fontSize: size, bold: true });
    const tH = H(title, { w: W, fontSize: size, bold: true, lineSpacingMultiple: 1.05 });
    const dH = H(s.desc, { w: W, fontSize: 15 });
    const kwR = pillRows(s.keywords, W);
    const total = 0.62 + 0.3 + tH + (s.en ? 0.5 : 0) + 0.35 + (dH ? dH + 0.3 : 0) + (kwR ? kwR * 0.56 : 0);
    let y = Math.max(0.9, 3.7 - total / 2);
    slide.addShape(ctx.shapes.ROUNDED_RECTANGLE, { x: X - 0.14, y: y + 0.04, w: 0.13, h: 0.54, rectRadius: 0.05, fill: { color: COLOR.cream }, line: { type: "none" }, objectName: "竖条装饰static" });
    text(slide, label, { x: X + 0.15, y, w: 4, h: 0.62, fontSize: 26, bold: true, charSpacing: 3, color: COLOR.cream, valign: "middle", noBalance: true, fontFace: FONT.head });
    y += 0.62 + 0.3;
    cal(slide, title, { x: X, y, w: W, h: tH, fontSize: size, color: COLOR.cream });
    y += tH;
    if (s.en) { const t = s.en.toUpperCase(); text(slide, t, { x: X, y: y + 0.08, w: W, h: 0.38, fontSize: oneLine(t, { w: W, max: 15, min: 10, bold: true, charSpacing: 2 }), bold: true, charSpacing: 2, color: COLOR.creamL, valign: "middle", noBalance: true }); y += 0.5; }
    line(slide, X, y + 0.17, 1.4, 0, COLOR.cream, 1.5);
    y += 0.35;
    if (s.desc) { text(slide, s.desc, { x: X, y, w: W, h: dH, fontSize: 15, color: COLOR.creamL }); y += dH + 0.3; }
    if (kwR) pills(slide, s.keywords, X, y, W, { align: "left", color: COLOR.cream, fill: null });
  }
}

/* ---------- 3 key points ---------- */
async function points3(s) {
  const layout = ctx.pickLayout(s, ["orbit", "cards", "banners"]);
  const slide = add(s);
  if (layout === "orbit") {
    deco(slide, "ribbon_bottom.png", 0, 6.06, CW, 1.44, "红绸装饰static");
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 6.05 : 6.75;
    const D = Math.min(3.97, bottom - y0 + 0.1), cx = 0.85 + D / 2, cy = (y0 + bottom) / 2;
    deco(slide, "orbit_rings.png", cx - D / 2, cy - D / 2, D, D, "红环装饰static");
    const d = D * (2.02 / 3.97);
    await ctx.pic(slide, s, 0, cx - d / 2, cy - d / 2, d, d, { circle: true, fallback: "photo_snow.jpg" });
    const X0 = cx + D / 2 + 0.45, dx = [0, 0.6, 0.45];
    const ws = dx.map((o) => 12.45 - X0 - o);
    const hSize = Math.min(...s.items.map((it, i) => oneLine(it.head, { w: ws[i], max: 20, min: 15, bold: true })));
    const bh = s.items.map((it, i) => H(it.body, { w: ws[i], fontSize: 14 }));
    const rowH = bh.map((b) => 0.46 + 0.06 + b);
    const gap = clamp((bottom - y0 - rowH.reduce((a, b) => a + b, 0)) / 3, 0.15, 0.55);
    let y = y0 + Math.max(0, (bottom - y0 - rowH.reduce((a, b) => a + b, 0) - gap * 2) / 2);
    s.items.forEach((it, i) => {
      const x = X0 + dx[i];
      dot(slide, x - 0.38, y + 0.13, 0.2);
      head(slide, it.head, { x, y, w: ws[i], h: 0.46, fontSize: hSize, color: COLOR.red });
      text(slide, it.body, { x, y: y + 0.52, w: ws[i], h: bh[i], fontSize: 14 });
      y += rowH[i] + gap;
    });
    conclusionLine(slide, s.conclusion, 6.12, { pill: true });
  } else if (layout === "cards") {
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 5.85 : 6.7;
    const cw = 3.77, gap = 0.31, x0 = CX - (3 * cw + 2 * gap) / 2;
    const bodyH = Math.max(...s.items.map((it) => H(it.body, { w: cw - 0.6, fontSize: 14 })));
    const need = 0.3 + 0.82 + 0.25 + 0.5 + 0.12 + bodyH + 0.35;
    const ch = clamp(need + 0.3, 3.0, bottom - y0);
    const cy = y0 + (bottom - y0 - ch) * 0.45;
    deco(slide, "ribbon_band.png", 0, cy + ch / 2 - 2.6, CW, 4.51, "红绸装饰static");
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw - 0.6, max: 21, min: 15, bold: true })));
    for (let i = 0; i < 3; i++) {
      const it = s.items[i], x = x0 + i * (cw + gap);
      card(slide, x, cy, cw, ch, { tr: 8 });
      let y = cy + Math.max(0.25, (ch - need) / 2 + 0.05);
      slide.addShape(ctx.shapes.OVAL, { x: x + cw / 2 - 0.41, y, w: 0.82, h: 0.82, fill: { color: COLOR.red }, line: { type: "none" }, objectName: "编号圆" });
      text(slide, num2(i), { x: x + cw / 2 - 0.41, y, w: 0.82, h: 0.82, fontSize: 22, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true, fontFace: FONT.head });
      y += 0.82 + 0.25;
      head(slide, it.head, { x: x + 0.3, y, w: cw - 0.6, h: 0.5, fontSize: hSize, color: COLOR.red, align: "center" });
      y += 0.62;
      text(slide, it.body, { x: x + 0.3, y, w: cw - 0.6, h: bodyH, fontSize: 14, align: "center" });
    }
    if (s.conclusion) {
      const h = H(s.conclusion, { w: 10.9, fontSize: 14 });
      text(slide, s.conclusion, { x: CX - 5.45, y: Math.max(bottom + 0.12, cy + ch + 0.15), w: 10.9, h, fontSize: 14, color: COLOR.blueD, bold: true, align: "center" });
    }
  } else { // banners
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 6.15 : 6.85;
    const vw = 3.3, sp = 4.0;
    const by = y0 + 0.05, py = by + 0.24, ph = bottom - py;
    const tip = 0.293 * Math.min(vw, ph);
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: vw - 0.6, max: 24, min: 16, bold: true })));
    const bodyH = Math.max(...s.items.map((it) => H(it.body, { w: vw - 0.7, fontSize: 14 })));
    const content = 0.55 + 0.2 + bodyH + 0.25 + 0.26;
    for (let i = 0; i < 3; i++) {
      const it = s.items[i], cx = CX + (i - 1) * sp, vx = cx - vw / 2;
      bar(slide, vx - 0.12, by, vw + 0.24, 0.16, "C00000", "红条");
      slide.addShape(ctx.shapes.PENTAGON, {
        x: cx - ph / 2, y: py + ph / 2 - vw / 2, w: ph, h: vw, rotate: 90, rectRadius: tip,   // homePlate's adj = tip depth / short side
        fill: { color: COLOR.white, transparency: 18 }, line: { color: COLOR.red, width: 1 }, objectName: "旗形卡片装饰",
      });
      let y = py + Math.max(0.3, (ph - tip - content) / 2);
      head(slide, it.head, { x: vx + 0.3, y, w: vw - 0.6, h: 0.55, fontSize: hSize, color: COLOR.red, align: "center" });
      y += 0.55 + 0.2;
      text(slide, it.body, { x: vx + 0.35, y, w: vw - 0.7, h: bodyH, fontSize: 14, align: "center" });
      y += bodyH + 0.25;
      [-0.3, 0, 0.3].forEach((o, k) => {
        const d = k === 1 ? 0.26 : 0.2;
        slide.addShape(ctx.shapes.STAR_5_POINT, { x: cx + o - d / 2, y: y + (0.26 - d) / 2, w: d, h: d, fill: { color: COLOR.red }, line: { type: "none" }, objectName: "星星装饰static" });
      });
    }
    conclusionLine(slide, s.conclusion, 6.3);
  }
}

/* ---------- 4 key points ---------- */
async function points4(s) {
  const layout = ctx.pickLayout(s, ["ribbon", "flags"]);
  const slide = add(s);
  const icons = ["flag", "users", "trending-up", "award"];
  if (layout === "ribbon") {
    deco(slide, "ribbon_vertical.png", 4.29, 0, 5.52, 7.5, "红绸装饰static");
    deco(slide, "dove.png", 5.0, s.conclusion ? 3.9 : 4.3, 1.22, 1.11, "白鸽装饰static");
    header(slide, s, { titleW: 5.4 });
    let y0 = 1.7;
    if (s.lead) {
      const h = H(s.lead, { w: 5.0, fontSize: 13 });
      text(slide, s.lead, { x: 1.1, y: 1.42, w: 5.0, h, fontSize: 13 });
      y0 = 1.42 + h + 0.25;
    }
    const bottom = s.conclusion ? 6.25 : 6.85;
    const colW = 3.75, cols = [[0.85, y0], [8.85, 1.7]];
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: colW - 0.85, max: 19, min: 14, bold: true })));
    for (let c = 0; c < 2; c++) {
      const [X, top0] = cols[c];
      const its = s.items.slice(c * 2, c * 2 + 2);
      const bh = its.map((it) => H(it.body, { w: colW - 0.85, fontSize: 13 }));
      const rows = bh.map((b) => 0.5 + 0.06 + b);
      const gap = clamp((bottom - top0 - rows[0] - rows[1]) / 2, 0.3, 1.0);
      let y = top0 + Math.max(0, (bottom - top0 - rows[0] - rows[1] - gap) / 2);
      for (let k = 0; k < 2; k++) {
        const it = its[k], i = c * 2 + k;
        slide.addShape(ctx.shapes.OVAL, { x: X, y: y - 0.04, w: 0.62, h: 0.62, fill: { color: COLOR.redL }, line: { color: COLOR.red, width: 1 }, objectName: "图标底" });
        await iconImg(slide, it.icon || icons[i], COLOR.red, X + 0.16, y + 0.12, 0.3, icons[i]);
        head(slide, it.head, { x: X + 0.82, y, w: colW - 0.85, h: 0.5, fontSize: hSize, color: COLOR.red });
        text(slide, it.body, { x: X + 0.82, y: y + 0.56, w: colW - 0.85, h: bh[k], fontSize: 13 });
        y += rows[k] + gap;
      }
    }
    conclusionLine(slide, s.conclusion, 6.42, { pill: true });
  } else { // flags
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 6.15 : 6.8;
    const cw = 5.1, gx = 1.03, gy = 0.3, X0 = CX - cw - gx / 2;
    const ch = Math.min(2.2, (bottom - y0 - gy) / 2);
    const yc = y0 + (bottom - y0 - 2 * ch - gy) * 0.4;
    const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw - 1.1, max: 20, min: 14, bold: true })));
    const bSize = Math.min(...s.items.map((it) => FIT(it.body, { w: cw - 1.15, h: ch - 1.0, max: 14, min: 11, bold: false, lineSpacingMultiple: 1.25 })));
    for (let i = 0; i < 4; i++) {
      const it = s.items[i], x = X0 + (i % 2) * (cw + gx), y = yc + Math.floor(i / 2) * (ch + gy);
      card(slide, x, y, cw, ch, { tr: 8, radius: 0.08 });
      const bH = H(it.body, { w: cw - 1.15, fontSize: bSize });
      const inner = 0.45 + 0.1 + bH;
      const iy = y + Math.max(0.2, (ch - inner) / 2);
      deco(slide, "flag.png", x - 0.5, y + ch / 2 - 0.37, 1.01, 0.74, "红旗");
      text(slide, num2(i), { x: x - 0.32, y: y + ch / 2 - 0.25, w: 0.62, h: 0.38, fontSize: 17, bold: true, color: COLOR.cream, align: "center", valign: "middle", noBalance: true, fontFace: FONT.head });
      head(slide, it.head, { x: x + 0.85, y: iy, w: cw - 1.1, h: 0.45, fontSize: hSize, color: COLOR.red });
      text(slide, it.body, { x: x + 0.85, y: iy + 0.55, w: cw - 1.15, h: bH, fontSize: bSize });
    }
    conclusionLine(slide, s.conclusion, 6.3);
  }
}

/* ---------- Comparison ---------- */
async function compare(s) {
  const layout = ctx.pickLayout(s, ["redBand", "hub"]);
  const slide = add(s);
  const L = s.left || {}, R = s.right || {};
  if (layout === "redBand") {
    header(slide, s);
    const bandY = 1.55;
    const lH = H(s.lead, { w: 10.9, fontSize: 14 });
    const bandH = s.lead ? lH + 0.5 + 0.95 : 1.15;
    bar(slide, 0, bandY, CW, bandH, COLOR.red, "红带");
    if (s.lead) text(slide, s.lead, { x: CX - 5.45, y: bandY + 0.25, w: 10.9, h: lH, fontSize: 14, color: COLOR.white, align: "center" });
    const cy = bandY + bandH - 0.95, bottom = s.conclusion ? 6.2 : 6.8;
    const cw = 5.56, gap = 0.32, x0 = CX - cw - gap / 2;
    const nMax = Math.max((L.items || []).length, (R.items || []).length, 2);
    const ch = Math.min(bottom - cy, Math.max(3.1, 1.45 + nMax * 0.6 + 0.45));
    const panel = async (x, g, def) => {
      slide.addShape(ctx.shapes.ROUND_2_SAME_RECTANGLE, { x, y: cy, w: cw, h: ch, fill: { color: COLOR.white, transparency: 5 }, line: { color: COLOR.red, width: 1 }, objectName: "卡片" });
      bar(slide, x, cy + ch - 0.16, cw, 0.16, COLOR.red, "红条");
      await iconImg(slide, g.icon || def, COLOR.red, x + 0.5, cy + 0.38, 0.46, def);
      head(slide, g.head, { x: x + 1.1, y: cy + 0.3, w: cw - 1.5, h: 0.62, fontSize: oneLine(g.head, { w: cw - 1.5, max: 26, min: 18, bold: true }), color: COLOR.red });
      line(slide, x + 0.5, cy + 1.08, cw - 1.0, 0, "E8A9AB", 0.75);
      const items = g.items || [];
      const step = Math.min(0.72, (ch - 1.45 - 0.35) / Math.max(items.length, 1));
      items.forEach((t, i) => {
        const y = cy + 1.3 + i * step;
        slide.addShape(ctx.shapes.OVAL, { x: x + 0.55, y: y + step / 2 - 0.06, w: 0.12, h: 0.12, fill: { color: COLOR.red }, line: { type: "none" }, objectName: "圆点装饰static" });
        text(slide, t, { x: x + 0.85, y, w: cw - 1.25, h: step, fontSize: 15, valign: "middle", noBalance: true });
      });
    };
    await panel(x0, L, "x-circle");
    await panel(x0 + cw + gap, R, "check-circle");
    if (s.conclusion) conclusionLine(slide, s.conclusion, Math.min(6.3, cy + ch + 0.15));
  } else { // hub
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 6.15 : 6.85;
    const D = Math.min(4.4, bottom - y0), cy = (y0 + bottom) / 2;
    deco(slide, "hub_ring.png", CX - D / 2, cy - D / 2, D, D, "红环装饰static");
    const d = D * (2.55 / 4.91);
    await ctx.pic(slide, s, 0, CX - d / 2, cy - d / 2, d, d, { circle: true, fallback: "photo_peak.jpg" });
    const colW = 3.94;
    const side = async (X, g, def) => {
      const items = g.items || [];
      const block = 0.6 + 0.2 + items.length * 0.62 + (items.length - 1) * 0.3;
      let y = cy - block / 2;
      const hs = oneLine(g.head, { w: colW - 0.7, max: 22, min: 16, bold: true });
      const hw = Math.min(colW - 0.7, longest(g.head, { fontSize: hs, bold: true }));
      const hx = X + (colW - hw - 0.55) / 2;
      await iconImg(slide, g.icon || def, COLOR.red, hx, y + 0.1, 0.4, def);
      head(slide, g.head, { x: hx + 0.55, y, w: hw + 0.05, h: 0.6, fontSize: hs, color: COLOR.red, noBalance: true });
      y += 0.8;
      const ps = Math.min(...items.map((t) => oneLine(t, { w: colW - 0.5, max: 15, min: 12 })));
      for (const t of items) {
        card(slide, X, y, colW, 0.62, { radius: 0.31, tr: 15, name: "胶囊" });
        text(slide, t, { x: X + 0.25, y, w: colW - 0.5, h: 0.62, fontSize: ps, align: "center", valign: "middle", noBalance: true });
        y += 0.92;
      }
    };
    await side(0.79, L, "x-circle");
    await side(CW - 0.79 - colW, R, "check-circle");
    conclusionLine(slide, s.conclusion, 6.3);
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
const SERIES = [COLOR.red, COLOR.blue, "E06666", COLOR.blueL];
async function stats(s) {
  const data = chartData(s);
  const layout = ctx.pickLayout(s, s.chart && data ? ["chart", "cards"] : data ? ["cards", "chart"] : ["cards"]);
  const slide = add(s);
  const y0 = top(slide, s);
  if (layout === "cards") {
    deco(slide, "ribbon_bottom.png", 0, 6.06, CW, 1.44, "红绸装饰static");
    const n = s.items.length, gap = 0.35, W = 11.4, cw = (W - (n - 1) * gap) / n, x0 = CX - W / 2;
    const vSize = Math.min(...s.items.map((it) => FIT(it.value, { w: cw - 0.4, h: 1.0, max: 50, min: 28 })));
    const lH = Math.max(...s.items.map((it) => H(it.label, { w: cw - 0.5, fontSize: 15 })));
    const ch = Math.min(5.6 - y0, 0.35 + 1.1 + 0.25 + 0.05 + 0.25 + lH + 0.4);
    const cy = y0 + Math.max(0, (5.55 - y0 - ch) * 0.4);
    s.items.forEach((it, i) => {
      const x = x0 + i * (cw + gap);
      card(slide, x, cy, cw, ch, { tr: 6, radius: 0.08 });
      bar(slide, x + 0.02, cy + 0.02, cw - 0.04, 0.1, i % 2 ? COLOR.blue : COLOR.red, "色条");
      const inner = 1.1 + 0.25 + 0.05 + 0.25 + lH;
      let y = cy + Math.max(0.25, (ch - inner) / 2 + 0.05);
      text(slide, it.value, { x: x + 0.2, y, w: cw - 0.4, h: 1.1, fontSize: vSize, bold: true, color: i % 2 ? COLOR.blue : COLOR.red, align: "center", valign: "middle", noBalance: true, fontFace: FONT.head });
      y += 1.1 + 0.25;
      bar(slide, x + cw / 2 - 0.25, y, 0.5, 0.04, "E8A9AB", "线条装饰static");
      y += 0.3;
      text(slide, it.label, { x: x + 0.25, y, w: cw - 0.5, h: lH, fontSize: 15, align: "center" });
    });
    sourceLine(slide, s, 1.1, cy + ch + 0.25, 11.1, "center");
  } else { // chart
    const X = 1.1, W = 4.4, n = s.items.length;
    const step = n > 3 ? 0.95 : 1.1;
    let y = y0 + 0.15;
    const vSize = Math.min(...s.items.map((it) => FIT(it.value, { w: 1.9, h: 0.65, max: 30, min: 18 })));
    s.items.forEach((it, i) => {
      bar(slide, X, y + 0.15, 0.1, step - 0.4, SERIES[i], "色条");
      text(slide, it.value, { x: X + 0.25, y, w: 1.9, h: step - 0.1, fontSize: vSize, bold: true, color: i % 2 ? COLOR.blue : COLOR.red, valign: "middle", noBalance: true, fontFace: FONT.head });
      text(slide, it.label, { x: X + 2.2, y, w: W - 2.2, h: step - 0.1, fontSize: 13, valign: "middle" });
      y += step;
    });
    sourceLine(slide, s, X, Math.max(y + 0.15, 5.9), W);
    const bx = 5.95, bw = 6.5, bh = 6.75 - y0;
    card(slide, bx, y0, bw, bh, { tr: 6, radius: 0.08, name: "图表底" });
    const d = data || { labels: s.items.map((i) => i.label), values: s.items.map(() => 0) };
    const max = Math.max(...d.values);
    slide.addChart(ctx.charts.BAR, [{ name: s.chart?.unit || "数值", labels: d.labels, values: d.values }], {
      x: bx + 0.3, y: y0 + 0.25, w: bw - 0.6, h: bh - 0.5, barDir: "col", barGapWidthPct: 80,
      chartColors: SERIES.slice(0, d.values.length),
      showTitle: !!s.chart?.title, title: s.chart?.title || "", titleColor: COLOR.ink, titleFontSize: 13, titleFontFace: FONT.body,
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: COLOR.ink, dataLabelFontSize: 14, dataLabelFontBold: true, dataLabelFontFace: FONT.body,
      catAxisLabelColor: COLOR.ink, catAxisLabelFontSize: 11, catAxisLabelFontFace: FONT.body, catAxisLineShow: true, catAxisLineColor: "BFBFBF",
      valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: max > 0 ? max * 1.18 : 1,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false,
      altText: `柱状图：${d.labels.map((l, i) => `${l} ${d.values[i]}`).join("、")}`,
    });
  }
}

/* ---------- Timeline ---------- */
async function timeline(s) {
  ctx.pickLayout(s, ["tags"]);
  const slide = add(s);
  deco(slide, "ribbon_bottom.png", 0, 6.06, CW, 1.44, "红绸装饰static");
  const y0 = top(slide, s);
  const bottom = s.conclusion ? 6.0 : 6.6;
  const n = s.items.length, x1 = 1.75, x2 = 11.58, sp = (x2 - x1) / (n - 1), cw = Math.min(2.7, sp - 0.2);
  const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw, max: 19, min: 14, bold: true })));
  const tSize = Math.min(...s.items.map((it) => oneLine(it.time, { w: Math.min(cw, 2.0) - 0.3, max: 17, min: 11, bold: true })));
  const bodyH = Math.max(0, ...s.items.map((it) => (it.body ? H(it.body, { w: cw, fontSize: 13 }) : 0)));
  const need = 0.46 + 0.13 + 0.22 + 0.25 + 0.5 + (bodyH ? 0.08 + bodyH : 0);
  const lineY = y0 + 0.46 + 0.13 + 0.25 + Math.max(0, (bottom - y0 - need) * 0.5);
  line(slide, 0.85, lineY, CW - 1.7, 0, COLOR.red, 2.5);
  s.items.forEach((it, i) => {
    const cx = x1 + i * sp;
    redTag(slide, it.time, cx, lineY - 0.25 - 0.13 - 0.46, { size: tSize, pointer: true, maxW: Math.min(cw, 2.0) });
    dot(slide, cx - 0.11, lineY - 0.11, 0.22, { lw: 2 });
    head(slide, it.head, { x: cx - cw / 2, y: lineY + 0.25, w: cw, h: 0.5, fontSize: hSize, color: COLOR.red, align: "center" });
    if (it.body) text(slide, it.body, { x: cx - cw / 2, y: lineY + 0.83, w: cw, h: H(it.body, { w: cw, fontSize: 13 }), fontSize: 13, align: "center" });
  });
  conclusionLine(slide, s.conclusion, 6.08, { pill: true });
}

/* ---------- Large image with text ---------- */
function textColumn(slide, s, X, W, y0, yMax) {
  let size = 14;
  const need = (sz) => H(s.body, { w: W, fontSize: sz }) + (s.points || []).reduce((a, p) => a + Math.max(0.42, H(p, { w: W - 0.45, fontSize: sz })) + 0.12, 0) + (s.conclusion ? H(s.conclusion, { w: W - 0.22, fontSize: 16, bold: true }) + 0.35 : 0) + 0.3;
  while (size > 11 && need(size) > yMax - y0) size -= 0.5;
  let y = y0 + Math.max(0, (yMax - y0 - need(size)) * 0.35);
  const bh = H(s.body, { w: W, fontSize: size });
  text(slide, s.body, { x: X, y, w: W, h: bh, fontSize: size });
  y += bh + 0.3;
  for (const p of s.points || []) {
    const ph = Math.max(0.42, H(p, { w: W - 0.45, fontSize: size }));
    card(slide, X, y, W, ph, { tr: 15, radius: 0.06, line: "E8A9AB", lw: 0.75, name: "要点底" });
    slide.addShape(ctx.shapes.OVAL, { x: X + 0.17, y: y + ph / 2 - 0.06, w: 0.12, h: 0.12, fill: { color: COLOR.red }, line: { type: "none" }, objectName: "圆点装饰static" });
    text(slide, p, { x: X + 0.42, y, w: W - 0.55, h: ph, fontSize: size, valign: "middle" });
    y += ph + 0.12;
  }
  if (s.conclusion) {
    y += 0.23;
    const ch = H(s.conclusion, { w: W - 0.22, fontSize: 16, bold: true });
    bar(slide, X, y + 0.05, 0.07, ch - 0.1);
    text(slide, s.conclusion, { x: X + 0.22, y, w: W - 0.22, h: ch, fontSize: 16, bold: true, color: COLOR.red, fontFace: FONT.head });
  }
}
async function imageText(s) {
  const layout = ctx.pickLayout(s, ["triptych", "frame"]);
  const slide = add(s);
  if (layout === "triptych") {
    deco(slide, "ribbon_wave.png", 0, 3.55, CW, 3.96, "红绸装饰static");
    header(slide, s);
    const sw = 1.52, gap = 0.2, X = 7.55, fb = ["photo_wall.jpg", "photo_peak.jpg", "photo_snow.jpg"];
    for (let i = 0; i < 3; i++) {
      const x = X + i * (sw + gap), y = i === 1 ? 2.05 : 1.55, h = 3.95;
      await ctx.pic(slide, s, i, x, y, sw, h, { fallback: fb[i] });
      slide.addShape(ctx.shapes.RECTANGLE, { x, y, w: sw, h, fill: { type: "none" }, line: { color: COLOR.red, width: 1.5 }, objectName: "图框装饰static" });
    }
    textColumn(slide, s, 1.1, 5.9, 1.65, 6.15);
  } else { // frame
    deco(slide, "ribbon_bottom.png", 0, 6.06, CW, 1.44, "红绸装饰static");
    header(slide, s);
    const ix = 0.95, iy = 1.75, iw = 6.0, ih = 4.2;
    slide.addShape(ctx.shapes.RECTANGLE, { x: ix + 0.2, y: iy + 0.2, w: iw, h: ih, fill: { type: "none" }, line: { color: COLOR.red, width: 1.5 }, objectName: "错位框装饰static" });
    slide.addShape(ctx.shapes.RECTANGLE, { x: ix - 0.06, y: iy - 0.06, w: iw + 0.12, h: ih + 0.12, fill: { color: COLOR.white }, line: { type: "none" }, objectName: "相框装饰static" });
    await ctx.pic(slide, s, 0, ix, iy, iw, ih, { fallback: "photo_wall.jpg" });
    textColumn(slide, s, 7.6, 4.85, 1.75, 6.75);
  }
}

/* ---------- Pull quote ---------- */
async function quote(s) {
  const layout = ctx.pickLayout(s, ["book", "sky"]);
  if (layout === "book") {
    const slide = add(s);
    deco(slide, "ribbon_book.png", 0, 3.5, CW, 4.0, "红绸装饰static");
    deco(slide, "book.png", 0.82, 1.06, 11.69, 6.45, "书本装饰static");
    const W = 8.6;
    text(slide, "“", { x: CX - 0.6, y: 2.2, w: 1.2, h: 0.9, fontSize: 66, color: COLOR.red, fontFace: "Georgia", align: "center", valign: "top", noBalance: true, objectName: "引号装饰static" });
    const size = FIT(s.text, { w: W, h: 2.3, max: 40, min: 26, lineSpacingMultiple: 1.3 });
    const qt = evenBreak(s.text, { w: W, fontSize: size, bold: true });
    const h = H(qt, { w: W, fontSize: size, bold: true, lineSpacingMultiple: 1.3 });
    const y = Math.max(3.05, 4.55 - h / 2 - (s.author ? 0.25 : 0));
    cal(slide, qt, { x: CX - W / 2, y, w: W, h, fontSize: size, color: COLOR.red, align: "center", lineSpacingMultiple: 1.3 });
    if (s.author) {
      line(slide, CX - 0.5, y + h + 0.25, 1.0, 0, COLOR.red, 1);
      text(slide, s.author, { x: CX - 3.5, y: y + h + 0.42, w: 7.0, h: 0.4, fontSize: oneLine(s.author, { w: 7, max: 16, min: 12 }), color: COLOR.redD, align: "center", valign: "middle", noBalance: true });
    }
  } else { // sky
    const slide = add(s, "section");
    const W = 8.6;
    const size = FIT(s.text, { w: W, h: 2.6, max: 50, min: 30, lineSpacingMultiple: 1.25 });
    const qt = evenBreak(s.text, { w: W, fontSize: size, bold: true });
    const h = H(qt, { w: W, fontSize: size, bold: true, lineSpacingMultiple: 1.25 });
    const y = Math.max(2.15, 3.7 - h / 2);
    text(slide, "“", { x: CX - 0.75, y: y - 1.25, w: 1.5, h: 1.15, fontSize: 88, color: COLOR.red, fontFace: "Georgia", align: "center", valign: "top", noBalance: true, objectName: "引号装饰static" });
    cal(slide, qt, { x: CX - W / 2, y, w: W, h, fontSize: size, align: "center", lineSpacingMultiple: 1.25 });
    bar(slide, CX - 0.6, y + h + 0.2, 1.2, 0.05, COLOR.red, "线条装饰static");
    if (s.author) text(slide, "—— " + s.author, { x: CX - 3.5, y: y + h + 0.42, w: 7.0, h: 0.42, fontSize: oneLine("—— " + s.author, { w: 7, max: 18, min: 12 }), color: COLOR.blueD, align: "center", valign: "middle", noBalance: true });
  }
}

/* ---------- Closing ---------- */
async function closing(s) {
  ctx.pickLayout(s, ["thanks"]);
  const slide = add(s, "closing");
  const W = 10.4;
  let { size, lines } = titleLines(s.title, W);
  const bH = H(s.body, { w: 8.6, fontSize: 15 });
  const rest = 0.45 + 0.56 + (bH ? 0.3 + bH : 0);
  while (size > 44 && linesH(lines, size) + rest > 5.5) size -= 2;
  let y = 0.95 + Math.max(0, (5.6 - linesH(lines, size) - rest) * 0.42);
  y += bigTitle(slide, lines, y, { W, size });
  y += 0.45;
  snipFrame(slide, s.tag || "THANK YOU", y);
  y += 0.56;
  if (s.body) { y += 0.3; text(slide, s.body, { x: CX - 4.3, y, w: 8.6, h: bH, fontSize: 15, color: COLOR.blueD, align: "center" }); }
}

/* ---------- Table (optional type) ---------- */
async function table(s) {
  ctx.pickLayout(s, ["panel"]);
  const slide = add(s);
  const y0 = top(slide, s);
  const rows = s.rows || [], cols = s.columns || [];
  const rowH = rows.length > 4 ? 0.58 : 0.66, headH = 0.55;
  const tw = 11.0, th = headH + rows.length * rowH, ph = th + 0.44;
  card(slide, 0.95, y0, 11.43, ph, { tr: 6, radius: 0.06, name: "表格底" });
  const b = (pt, c) => ({ type: "solid", pt, color: c }), n = { type: "none" };
  const Hd = (t) => ({ text: t, options: { bold: true, fontSize: 14, color: COLOR.white, fill: { color: COLOR.red }, border: [n, n, n, n] } });
  const Cl = (t, j, r) => ({ text: t ?? "", options: { bold: j === 0, color: j === 0 ? COLOR.red : COLOR.ink, fill: { color: r % 2 ? "FBEFEF" : COLOR.white }, border: [n, n, b(0.75, "E8A9AB"), n] } });
  const len = (t) => [...String(t ?? "")].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2000 ? 0.55 : 1), 0);
  const weight = cols.map((c, j) => Math.max(2, len(c), ...rows.map((r) => len(r[j]))));
  let colW = weight.map((w) => (tw * w) / weight.reduce((a, c) => a + c, 0));
  const short = colW.map((w) => Math.max(1.2, w)), extra = short.reduce((a, c) => a + c, 0) - tw;
  if (extra > 0) { const wide = short.map((w, j) => (colW[j] > 1.2 ? w : 0)), sum = wide.reduce((a, c) => a + c, 0); colW = short.map((w, j) => (wide[j] ? w - (extra * w) / sum : w)); }
  slide.addTable([cols.map(Hd), ...rows.map((r, i) => cols.map((_, j) => Cl(r[j], j, i)))], {
    x: 1.165, y: y0 + 0.22, w: tw, colW, rowH: [headH, ...rows.map(() => rowH)],
    fontSize: 12.5, color: COLOR.ink, fontFace: FONT.body, margin: [0.04, 0.12, 0.04, 0.12], valign: "middle",
  });
  if (s.conclusion) {
    const y = y0 + ph + 0.2;
    const h = H(s.conclusion, { w: 10.6, fontSize: 15, bold: true });
    bar(slide, 1.165, y + 0.05, 0.07, h - 0.1);
    text(slide, s.conclusion, { x: 1.4, y, w: 10.6, h, fontSize: 15, bold: true, color: COLOR.blueD, fontFace: FONT.head });
  }
}

/* ---------- Steps (optional type) ---------- */
async function steps(s) {
  ctx.pickLayout(s, ["flags"]);
  const slide = add(s);
  deco(slide, "ribbon_bottom.png", 0, 6.06, CW, 1.44, "红绸装饰static");
  const y0 = top(slide, s, { minTop: 1.85 });
  const n = s.items.length, X = 1.0, W = 11.33, gap = 0.55, cw = (W - (n - 1) * gap) / n;
  const hSize = Math.min(...s.items.map((it) => oneLine(it.head, { w: cw - 0.5, max: 19, min: 13, bold: true })));
  const bodyH = Math.max(...s.items.map((it) => H(it.body, { w: cw - 0.5, fontSize: 14 })));
  const ch = Math.min(6.4 - y0, 0.3 + 0.74 + 0.3 + 0.5 + 0.12 + bodyH + 0.35);
  const cy = y0 + Math.max(0, (6.3 - y0 - ch) * 0.4);
  for (let i = 0; i < n; i++) {
    const it = s.items[i], x = X + i * (cw + gap);
    card(slide, x, cy, cw, ch, { tr: 8, radius: 0.08 });
    deco(slide, "flag.png", x + 0.2, cy + 0.3, 1.01, 0.74, "红旗");
    text(slide, num2(i), { x: x + 0.38, y: cy + 0.42, w: 0.62, h: 0.38, fontSize: 17, bold: true, color: COLOR.cream, align: "center", valign: "middle", noBalance: true, fontFace: FONT.head });
    head(slide, it.head, { x: x + 0.25, y: cy + 1.34, w: cw - 0.5, h: 0.5, fontSize: hSize, color: COLOR.red });
    text(slide, it.body, { x: x + 0.25, y: cy + 1.96, w: cw - 0.5, h: bodyH, fontSize: 14 });
    if (i < n - 1) await iconImg(slide, "chevrons-right", COLOR.red, x + cw + (gap - 0.34) / 2, cy + ch / 2 - 0.17, 0.34);
  }
}

/* ============================ Entry point ============================ */
async function render(deck, c) {
  ctx = c;
  const M = (title, file) => ctx.pres.defineSlideMaster({ title, background: { path: ctx.asset(file) }, objects: [] });
  M("PR_CONTENT", "bg_content.jpg");
  M("PR_COVER", "bg_cover.jpg");
  M("PR_SECTION", "bg_section.jpg");
  M("PR_TOC", "bg_toc.jpg");
  M("PR_CLOSING", "bg_closing.jpg");
  M("PR_RED", "bg_red.jpg");
  await ctx.renderAll({ cover, toc, section, points3, points4, compare, stats, timeline, imageText, quote, closing, table, steps });
}

module.exports = { render };
