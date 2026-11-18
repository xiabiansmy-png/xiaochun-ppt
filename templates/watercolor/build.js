/**
 * 模板：蓝驼水彩（watercolor）
 * ------------------------------------------------------------------
 * 版式来源：网络模板「深蓝色の水彩」——白纸底，左上和右下角有雾蓝 + 暖驼色的水彩晕染；
 * 内容页是纯白底上的深蓝（#295D83）/ 驼色（#D2B08E）色块：箭头条、圆角方块、圆形数据泡、大色带。
 * 只借版式和配色。所有图片（水彩背景 + 照片）都由 AI 生成：assets.ai.json + tools/gen_assets.js，
 * 内容页背景 bg_content.jpg、柔和背景 bg_soft.jpg 由 derive.js 从 bg_wash.jpg 派生。
 *
 * 字体：大标题用「微软雅黑 Light」（Windows 自带，接近原模板的细圆体），其余用微软雅黑。
 * 驼色块上放白字时用加深的驼色 camelD（#AE8862），原色 #D2B08E 上的白字对比度只有 2.0。
 *
 * 版式（和 meta.json → layouts 保持一致）：
 *   cover     hero                       水彩背景，居中「“ 标签 ”」+ 细体大标题 + 副标题 + 说明
 *   toc       panel                      水彩背景上的白色浮起面板：左「目录 / CONTENTS」，右编号圆点列表（>5 条分两列）
 *   section   wash | photo               水彩背景居中「“ PART ONE ”」+ 标题 / 左侧整幅照片 + 右侧驼色大编号
 *   points3   bands | photos | circle    左整幅照片 + 3 条深蓝色带（驼色图标圆压边）/ 3 张照片 + 气泡标签 / 大圆图 + 弧形排列的小图标
 *   points4   tiles | chevrons           中间 2×2 圆角方块（蓝驼交替）+ 四角文字 / 一排箭头条，说明上下交错
 *   compare   blocks | banners           左侧上蓝下驼两大色块 + 右侧照片 / 两列箭头标签 + 列表
 *   stats     bubbles | cards | chart    大小不一的数据圆泡 / 顶部色块数字卡片 / 数字列表 + 蓝驼柱状图
 *   timeline  chevrons | vertical        一排箭头条写时间 / 竖向虚线 + 驼色圆点
 *   imageText banner | panel             横贯深蓝色带压照片 / 照片 + 驼色文字面板 + 右侧要点
 *   quote     wash | photo               柔和水彩背景上的居中金句 / 左照片 + 右深蓝面板
 *   closing   thanks                     同封面
 *   table     grid          （可选）     深蓝表头 + 驼色浅底隔行
 *   steps     tiles         （可选）     编号方块压在卡片顶部 + 驼色箭头
 */
const COLOR = {
  blue: "295D83", blueD: "245172", blueG: "5C819D", blueL: "DCE6EE",
  camel: "D2B08E", camelD: "AE8862", camelT: "9C7752", camelL: "E5D1BD", camelLL: "F7F1EA", camelInk: "1F4766",
  ink: "3F3F3F", gray: "767676", line: "DADADA", white: "FFFFFF",
};
const FONT = { title: "微软雅黑 Light", head: "微软雅黑", body: "微软雅黑", serif: "Georgia" };
const CW = 13.333, CX = CW / 2, L = 0.75, R = CW - 0.75, CWID = R - L;
const PART = ["ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE"];
const PHOTOS = ["photo_laptop.jpg", "photo_tablet.jpg", "photo_notebook.jpg", "photo_desk.jpg", "photo_phone.jpg", "photo_tower.jpg", "photo_wreath.jpg"];
const ICONS3 = ["target", "trending-up", "search"], ICONS4 = ["target", "bar-chart-2", "users", "award"];

/* ---------------- 排版组件 ---------------- */
let ctx;
function text(slide, str, o) {
  if (str === undefined || str === null || str === "") return 0;
  const opt = { isTextBox: true, margin: 0, color: COLOR.ink, fontFace: FONT.body, fontSize: 13, valign: "top", lineSpacingMultiple: 1.25, ...o };
  const s = o.noBalance ? String(str) : ctx.balance(String(str), { w: opt.w, fontSize: opt.fontSize, bold: opt.bold, charSpacing: opt.charSpacing, lineSpacingMultiple: opt.lineSpacingMultiple });
  delete opt.noBalance;
  slide.addText(s, opt);
  return opt.h;
}
const head = (slide, str, o) => text(slide, str, { fontFace: FONT.head, bold: true, color: COLOR.blue, valign: "middle", lineSpacingMultiple: 1.1, ...o });
const light = (slide, str, o) => text(slide, str, { fontFace: FONT.title, color: COLOR.blue, valign: "middle", lineSpacingMultiple: 1.05, noBalance: true, ...o });
const oneLine = (str, o) => ctx.fitLine(String(str || ""), o);
const H = (str, o) => (str ? ctx.measure(String(str), { lineSpacingMultiple: 1.25, ...o }).needH + 0.04 : 0);
const FIT = (str, o) => ctx.fit(String(str || ""), { lineSpacingMultiple: 1.1, ...o });
const longest = (str, o) => ctx.measure(String(str || ""), { w: 40, ...o }).longest || 0;
const num2 = (i) => String(i + 1).padStart(2, "0");
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const alt = (i) => (i % 2 ? COLOR.blue : COLOR.camelD);

/** 多行标题按字数均分断行（优先在标点后断），避免最后一行只剩一两个字 */
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
  const brk = [];
  for (let k = 1; k < m.lines; k++) {
    const c = cands(brk.length ? brk[brk.length - 1] : -1, (acc * k) / m.lines);
    if (!c.length) return str;
    brk.push(c[0]);
  }
  const out = join(brk);
  return fits(out) ? out.join("\n") : str;
}

function shape(slide, kind, x, y, w, h, fill, o = {}) {
  slide.addShape(ctx.shapes[kind], {
    x, y, w, h, fill: fill ? { color: fill, transparency: o.tr || 0 } : { type: "none" },
    line: o.line ? { color: o.line, width: o.lw || 1, dashType: o.dash } : { type: "none" },
    rectRadius: o.radius, rotate: o.rotate, shadow: o.shadow, objectName: o.name || "色块",
  });
}
const rect = (slide, x, y, w, h, fill, o) => shape(slide, "RECTANGLE", x, y, w, h, fill, o);
const round = (slide, x, y, w, h, fill, o = {}) => shape(slide, "ROUNDED_RECTANGLE", x, y, w, h, fill, { radius: 0.12, ...o });
const oval = (slide, x, y, d, fill, o) => shape(slide, "OVAL", x, y, d, d, fill, o);
function line(slide, x, y, w, h, color = COLOR.camel, width = 1, dash) {
  slide.addShape(ctx.shapes.LINE, { x, y, w, h, line: { color, width, dashType: dash }, objectName: "线条装饰static" });
}
/** 蓝 + 驼两段短横条（标题下的签名装饰） */
function duoBar(slide, x, y, center = false) {
  const x0 = center ? x - 0.4 : x;
  rect(slide, x0, y, 0.5, 0.05, COLOR.blue, { name: "线条装饰static" });
  rect(slide, x0 + 0.54, y, 0.26, 0.05, COLOR.camel, { name: "线条装饰static" });
}
async function iconImg(slide, name, color, x, y, s, def) {
  slide.addImage({ data: await ctx.icon(name, color, def), x, y, w: s, h: s, objectName: "图标static" });
}
/** 实心圆 + 白色图标 */
async function iconDot(slide, name, def, cx, cy, d, fill = COLOR.camel, ring) {
  oval(slide, cx - d / 2, cy - d / 2, d, fill, { line: ring, lw: ring ? 4 : 0, name: "图标底static" });
  await iconImg(slide, name, COLOR.white, cx - d * 0.27, cy - d * 0.27, d * 0.54, def);
}
/** 描边关键词胶囊 */
function pills(slide, kws, X, y, W, { align = "center", color = COLOR.camelT, size = 12 } = {}) {
  if (!kws?.length) return y;
  const pad = 0.44, gap = 0.16, h = 0.38;
  const ws = kws.map((k) => longest(k, { fontSize: size }) + pad);
  const rows = [[]]; let acc = 0;
  ws.forEach((w, i) => { if (acc + w > W && rows[rows.length - 1].length) { rows.push([]); acc = 0; } rows[rows.length - 1].push(i); acc += w + gap; });
  for (const row of rows) {
    const rw = row.reduce((a, i) => a + ws[i], 0) + (row.length - 1) * gap;
    let x = align === "center" ? X + (W - rw) / 2 : X;
    for (const i of row) {
      shape(slide, "ROUNDED_RECTANGLE", x, y, ws[i], h, COLOR.white, { radius: h / 2, line: COLOR.camel, lw: 1, name: "标签" });
      text(slide, kws[i], { x, y, w: ws[i], h, fontSize: size, color, align: "center", valign: "middle", noBalance: true });
      x += ws[i] + gap;
    }
    y += h + 0.12;
  }
  return y - 0.12;
}
const pillRows = (kws, W, size = 12) => {
  if (!kws?.length) return 0;
  let rows = 1, acc = 0;
  kws.forEach((k) => { const w = longest(k, { fontSize: size }) + 0.44; if (acc + w > W && acc > 0) { rows++; acc = 0; } acc += w + 0.16; });
  return rows;
};

/* ---------- 页面与页眉 ---------- */
function add(s, kind = "content") {
  const master = { content: "WC_CONTENT", wash: "WC_WASH", soft: "WC_SOFT", white: "WC_WHITE" }[kind];
  return ctx.addSlide(s, { master, bg: "FFFFFF" });
}
const eyebrowOf = (s) => (s.eyebrow !== undefined ? s.eyebrow : s._sectionNo ? `${s._num} · ${s._sectionTitle}` : "");
/** 内容页页眉：驼色小标签 + 深蓝标题 + 蓝驼短横条；返回页眉下沿 */
function header(slide, s, { x = L, w = CWID, color = COLOR.blue, ebColor = COLOR.camelT, bar = true } = {}) {
  const eb = eyebrowOf(s);
  let y = 0.42;
  if (eb) {
    text(slide, eb, { x, y, w, h: 0.32, fontSize: oneLine(eb, { w, max: 12, min: 10, bold: true, charSpacing: 1 }), bold: true, charSpacing: 1, color: ebColor, valign: "middle", noBalance: true });
    y += 0.34;
  } else y += 0.1;
  const size = oneLine(s.title, { w, max: 28, min: 20, bold: true });
  head(slide, s.title, { x, y, w, h: 0.6, fontSize: size, color, noBalance: true });
  y += 0.66;
  if (bar) duoBar(slide, x, y);
  return y + 0.05;
}
/** 页眉 + 导语；返回正文起点 */
function top(slide, s, o = {}) {
  const after = header(slide, s, o);
  const x = o.x ?? L, w = o.w ?? CWID;
  if (!s.lead) return Math.max(after + 0.35, o.minTop ?? 1.75);
  const h = H(s.lead, { w, fontSize: 13 });
  text(slide, s.lead, { x, y: after + 0.2, w, h, fontSize: 13, color: COLOR.gray });
  return Math.max(after + 0.2 + h + 0.3, o.minTop ?? 1.75);
}
/** 结论行：深蓝粗体 + 左侧驼色竖条 */
function conclusionLine(slide, str, y, { x = L, w = CWID, size = 15, center = false } = {}) {
  if (!str) return 0;
  const fs = center ? oneLine(str, { w: w - 0.4, max: size, min: 12, bold: true }) : size;
  const h = center ? 0.46 : H(str, { w: w - 0.25, fontSize: fs, bold: true, lineSpacingMultiple: 1.2 });
  if (center) {
    const tw = Math.min(w, longest(str, { fontSize: fs, bold: true }) + 0.25);
    rect(slide, CX - tw / 2 - 0.22, y + 0.1, 0.07, h - 0.2, COLOR.camel, { name: "竖条装饰static" });
    text(slide, str, { x: CX - tw / 2, y, w: tw + 0.1, h, fontSize: fs, bold: true, color: COLOR.blueD, valign: "middle", noBalance: true });
  } else {
    rect(slide, x, y + 0.05, 0.07, h - 0.1, COLOR.camel, { name: "竖条装饰static" });
    text(slide, str, { x: x + 0.25, y, w: w - 0.25, h, fontSize: fs, bold: true, color: COLOR.blueD, lineSpacingMultiple: 1.2 });
  }
  return h;
}
function sourceLine(slide, s, x, y, w, align = "left") {
  const src = "数据来源：" + s.source;
  text(slide, src, { x, y, w, h: H(src, { w, fontSize: 10 }), fontSize: 10, color: COLOR.gray, noBalance: true, align });
}

/* ---------- 封面 / 结尾共用的大标题 ---------- */
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
/** 大标题：放得下 54pt 以上就一行；否则在标点处拆两行；再不行按字数均分 */
function titleLines(str, W, { max = 72, min1 = 54, max2 = 60, min = 38 } = {}) {
  str = String(str);
  const one = oneLine(str, { w: W, max, min: min1 });
  if (ctx.measure(str, { w: W, fontSize: one }).lines === 1) return { size: one, text: str, n: 1 };
  const parts = splitAtPunct(str);
  if (parts) {
    const size = Math.min(...parts.map((p) => oneLine(p, { w: W, max: max2, min })));
    if (parts.every((p) => ctx.measure(p, { w: W, fontSize: size }).lines === 1)) return { size, text: parts.join("\n"), n: 2 };
  }
  const size = FIT(str, { w: W, h: 2.4, max: max2, min, lineSpacingMultiple: 1.05 });
  const t = evenBreak(str, { w: W, fontSize: size, lineSpacingMultiple: 1.05 });
  return { size, text: t, n: t.split("\n").length };
}
const titleH = (t) => H(t.text, { w: 40, fontSize: t.size, lineSpacingMultiple: 1.05 });
/** “ 标签 ” —— 原模板封面上方的衬线引号标签 */
function quoteTag(slide, str, y, { x = CX - 4.5, w = 9, size = 22, align = "center" } = {}) {
  const t = `“ ${str} ”`;
  text(slide, t, { x, y, w, h: 0.5, fontSize: oneLine(t, { w, max: size, min: 14 }), fontFace: FONT.serif, color: COLOR.blueG, align, valign: "middle", noBalance: true });
  return 0.5;
}

/* ============================ 页面类型 ============================ */

async function cover(s) {
  ctx.pickLayout(s, ["hero"]);
  const slide = add(s, "wash");
  const W = 10.6;
  const t = titleLines(s.title, W);
  const tH = titleH(t);
  const subS = s.subtitle ? oneLine(s.subtitle, { w: 9.6, max: 18, min: 13 }) : 0;
  const dH = H(s.desc, { w: 8.4, fontSize: 12 });
  const total = (s.tag ? 0.5 + 0.15 : 0) + tH + 0.28 + 0.05 + (s.subtitle ? 0.25 + 0.42 : 0) + (dH ? 0.18 + dH : 0);
  let y = Math.max(0.7, 3.6 - total / 2);
  if (s.tag) { y += quoteTag(slide, s.tag, y) + 0.15; }
  light(slide, t.text, { x: CX - W / 2, y, w: W, h: tH, fontSize: t.size, align: "center" });
  y += tH + 0.28;
  duoBar(slide, CX, y, true);
  y += 0.05;
  if (s.subtitle) { y += 0.25; text(slide, s.subtitle, { x: CX - 4.8, y, w: 9.6, h: 0.42, fontSize: subS, color: COLOR.blueD, align: "center", valign: "middle", noBalance: true }); y += 0.42; }
  if (dH) { y += 0.18; text(slide, s.desc, { x: CX - 4.2, y, w: 8.4, h: dH, fontSize: 12, color: COLOR.blueG, align: "center" }); }
}

async function toc(s) {
  ctx.pickLayout(s, ["panel"]);
  const slide = add(s, "wash");
  rect(slide, 0.6, 0.5, CW - 1.2, 6.5, COLOR.white, { name: "目录面板", shadow: { type: "outer", blur: 14, offset: 4, angle: 90, color: "000000", opacity: 0.14 } });
  // 左：目录 / CONTENTS / 说明
  const tt = s.title || "目录";
  const ts = oneLine(tt, { w: 3.7, max: 60, min: 36 });
  const dH = H(s.desc, { w: 3.5, fontSize: 12 });
  const leftH = 1.05 + 0.4 + (dH ? 0.3 + dH : 0);
  let y = 3.75 - leftH / 2;
  light(slide, tt, { x: 1.25, y, w: 3.7, h: 1.05, fontSize: ts });
  y += 1.05;
  text(slide, "CONTENTS", { x: 1.28, y, w: 3.5, h: 0.4, fontSize: 14, charSpacing: 3, color: COLOR.blueD, valign: "middle", noBalance: true });
  y += 0.4;
  if (dH) { duoBar(slide, 1.28, y + 0.12); text(slide, s.desc, { x: 1.28, y: y + 0.3, w: 3.5, h: dH, fontSize: 12, color: COLOR.gray }); }
  line(slide, 5.0, 1.55, 0, 4.4, COLOR.camelL, 1);
  // 右：列表
  const items = s.items || [], n = items.length;
  const cols = n > 5 ? 2 : 1, rows = Math.ceil(n / cols);
  const X = 5.55, W = 6.75, gap = 0.3, cw = (W - (cols - 1) * gap) / cols;
  const d = cols === 1 ? 0.62 : 0.54;
  const rowH = Math.min(1.12, 5.6 / rows), y0 = 3.75 - (rows * rowH) / 2;
  const hS = Math.min(...items.map((it) => oneLine(it.head, { w: cw - d - 0.3, max: cols === 1 ? 22 : 18, min: 13 })));
  const subS = cols === 1 ? 12 : 11;
  items.forEach((it, i) => {
    const c = cols === 1 ? 0 : Math.floor(i / rows), r = cols === 1 ? i : i % rows;
    const x = X + c * (cw + gap), cy = y0 + r * rowH + rowH / 2;
    oval(slide, x, cy - d / 2, d, i % 2 ? COLOR.camelD : COLOR.blue, { name: "编号圆" });
    text(slide, num2(i), { x, y: cy - d / 2, w: d, h: d, fontSize: cols === 1 ? 15 : 13, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
    const tx = x + d + 0.25, tw = cw - d - 0.25;
    const sh = it.sub ? H(it.sub, { w: tw, fontSize: subS }) : 0;
    const blockH = 0.5 + (sh ? sh : 0);
    const by = cy - blockH / 2;
    text(slide, it.head, { x: tx, y: by, w: tw, h: 0.5, fontSize: hS, color: COLOR.blue, valign: "middle", noBalance: true });
    if (sh) text(slide, it.sub, { x: tx, y: by + 0.5, w: tw, h: sh, fontSize: subS, color: COLOR.gray });
  });
}

/* ---------- 章节页 ---------- */
async function section(s) {
  const layout = ctx.pickLayout(s, ["wash", "photo"]);
  const no = s._sectionNo || 1;
  const part = `PART ${PART[no - 1] || no}`;
  if (layout === "wash") {
    const slide = add(s, "wash");
    const W = 10;
    const t = titleLines(s.title, W, { max: 60, min1: 44, max2: 52, min: 36 });
    const tH = titleH(t);
    const dH = H(s.desc, { w: 8.4, fontSize: 13 });
    const kwR = pillRows(s.keywords, 9);
    const total = 0.55 + 0.15 + tH + (s.en ? 0.12 + 0.36 : 0) + 0.3 + 0.05 + (dH ? 0.3 + dH : 0) + (kwR ? 0.3 + kwR * 0.5 : 0);
    let y = Math.max(0.6, 3.65 - total / 2);
    quoteTag(slide, part, y, { size: 26 });
    y += 0.55 + 0.15;
    light(slide, t.text, { x: CX - W / 2, y, w: W, h: tH, fontSize: t.size, align: "center" });
    y += tH;
    if (s.en) { const e = s.en.toUpperCase(); y += 0.12; text(slide, e, { x: CX - W / 2, y, w: W, h: 0.36, fontSize: oneLine(e, { w: W, max: 13, min: 10, charSpacing: 2 }), charSpacing: 2, color: COLOR.blueG, align: "center", valign: "middle", noBalance: true }); y += 0.36; }
    y += 0.3; duoBar(slide, CX, y, true); y += 0.05;
    if (dH) { y += 0.3; text(slide, s.desc, { x: CX - 4.2, y, w: 8.4, h: dH, fontSize: 13, color: COLOR.gray, align: "center" }); y += dH; }
    if (kwR) pills(slide, s.keywords, CX - 4.5, y + 0.3, 9);
  } else { // photo
    const slide = add(s);
    await ctx.pic(slide, s, 0, 0, 0, 5.1, 7.5, { fallback: "photo_tower.jpg" });
    const X = 5.95, W = 6.6;
    const size = (() => { const one = oneLine(s.title, { w: W, max: 44, min: 32, bold: true }); return ctx.measure(s.title, { w: W, fontSize: one, bold: true }).lines === 1 ? one : FIT(s.title, { w: W, h: 1.7, max: 40, min: 28, bold: true }); })();
    const title = evenBreak(s.title, { w: W, fontSize: size, bold: true, lineSpacingMultiple: 1.1 });
    const tH = H(title, { w: W, fontSize: size, bold: true, lineSpacingMultiple: 1.1 });
    const dH = H(s.desc, { w: W, fontSize: 13 });
    const kwR = pillRows(s.keywords, W);
    const total = 1.25 + 0.42 + 0.2 + tH + (s.en ? 0.1 + 0.36 : 0) + 0.3 + 0.05 + (dH ? 0.3 + dH : 0) + (kwR ? 0.3 + kwR * 0.5 : 0);
    let y = Math.max(0.5, 3.7 - total / 2);
    text(slide, String(no).padStart(2, "0"), { x: X - 0.05, y, w: 3, h: 1.25, fontSize: 88, fontFace: FONT.serif, color: COLOR.camel, valign: "middle", noBalance: true, objectName: "大编号装饰" });
    y += 1.25;
    text(slide, part, { x: X, y, w: W, h: 0.42, fontSize: 15, charSpacing: 3, color: COLOR.blueG, valign: "middle", noBalance: true, fontFace: FONT.serif });
    y += 0.42 + 0.2;
    head(slide, title, { x: X, y, w: W, h: tH, fontSize: size, valign: "top" });
    y += tH;
    if (s.en) { const e = s.en.toUpperCase(); y += 0.1; text(slide, e, { x: X, y, w: W, h: 0.36, fontSize: oneLine(e, { w: W, max: 13, min: 10, charSpacing: 2 }), charSpacing: 2, color: COLOR.blueG, valign: "middle", noBalance: true }); y += 0.36; }
    y += 0.3; duoBar(slide, X, y); y += 0.05;
    if (dH) { y += 0.3; text(slide, s.desc, { x: X, y, w: W, h: dH, fontSize: 13, color: COLOR.gray }); y += dH; }
    if (kwR) pills(slide, s.keywords, X, y + 0.3, W, { align: "left" });
  }
}

/* ---------- 3 要点 ---------- */
async function points3(s) {
  const layout = ctx.pickLayout(s, ["bands", "photos", "circle"]);
  const slide = add(s);
  const items = s.items;
  if (layout === "bands") {
    await ctx.pic(slide, s, 0, 0, 0, 4.55, 7.5, { fallback: "photo_tower.jpg" });
    const X = 5.3, W = R - X;
    const y0 = top(slide, s, { x: X, w: W });
    const bottom = s.conclusion ? 6.25 : 6.95, gap = 0.18;
    const bh = Math.min(1.55, (bottom - y0 - 2 * gap) / 3);
    const by0 = y0 + Math.max(0, (bottom - y0 - 3 * bh - 2 * gap) / 2);
    const bx = 6.05, tx = 6.85, tw = R - tx - 0.25;
    const hS = Math.min(...items.map((it) => oneLine(it.head, { w: tw, max: 17, min: 13, bold: true })));
    for (let i = 0; i < 3; i++) {
      const it = items[i], y = by0 + i * (bh + gap);
      rect(slide, bx, y, R - bx, bh, COLOR.blue, { name: "色带" });
      const d = Math.min(1.0, bh - 0.1);
      await iconDot(slide, it.icon, ICONS3[i], bx, y + bh / 2, d, COLOR.camel, COLOR.white);
      const bH = H(it.body, { w: tw, fontSize: 12.5 });
      const inner = 0.42 + 0.06 + bH;
      const yy = y + (bh - inner) / 2;
      head(slide, it.head, { x: tx, y: yy, w: tw, h: 0.42, fontSize: hS, color: COLOR.white, noBalance: true });
      text(slide, it.body, { x: tx, y: yy + 0.48, w: tw, h: bH, fontSize: 12.5, color: COLOR.white });
    }
    if (s.conclusion) conclusionLine(slide, s.conclusion, 6.42, { x: X, w: W });
  } else if (layout === "photos") {
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 6.2 : 6.95;
    const gap = 0.5, cw = (CWID - 2 * gap) / 3;
    const bodyH = Math.max(...items.map((it) => H(it.body, { w: cw - 0.3, fontSize: 13 })));
    const ph = clamp(bottom - y0 - 0.25 - 0.3 - bodyH - 0.1, 1.5, 2.7);
    const gy = y0 + Math.max(0, (bottom - y0 - (ph + 0.25 + 0.3 + bodyH)) * 0.4);
    const hS = Math.min(...items.map((it) => oneLine(it.head, { w: cw - 0.8, max: 16, min: 12, bold: true })));
    for (let i = 0; i < 3; i++) {
      const it = items[i], x = L + i * (cw + gap);
      await ctx.pic(slide, s, i, x, gy, cw, ph, { fallback: PHOTOS[i + 1] });
      const tw = clamp(longest(it.head, { fontSize: hS, bold: true }) + 0.6, 1.4, cw - 0.3);
      const tx = x + 0.25, ty = gy + ph - 0.25, fill = i % 2 ? COLOR.blue : COLOR.camelD;
      rect(slide, tx, ty, tw, 0.5, fill, { name: "标签" });
      shape(slide, "RIGHT_TRIANGLE", tx, ty + 0.5, 0.22, 0.16, fill, { rotate: 0, name: "标签尖角装饰static" });
      head(slide, it.head, { x: tx + 0.1, y: ty, w: tw - 0.2, h: 0.5, fontSize: hS, color: COLOR.white, align: "center", noBalance: true });
      text(slide, it.body, { x: x + 0.15, y: ty + 0.5 + 0.3, w: cw - 0.3, h: bodyH, fontSize: 13 });
    }
    if (s.conclusion) conclusionLine(slide, s.conclusion, 6.35, { center: true });
  } else { // circle
    const y0 = top(slide, s);
    const bottom = s.conclusion ? 6.2 : 6.95;
    const r = clamp((bottom - y0) / 2 - 0.05, 1.45, 1.95), cy = (y0 + bottom) / 2, cx = L + 0.15 + r;
    oval(slide, cx - r - 0.14, cy - r - 0.14, 2 * r + 0.28, null, { line: COLOR.blueL, lw: 1.5, name: "圆环装饰static" });
    await ctx.pic(slide, s, 0, cx - r, cy - r, 2 * r, 2 * r, { circle: true, fallback: "photo_laptop.jpg" });
    const Rr = r + 0.95, d = 0.78, tx = cx + Rr + 0.75, tw = R - tx;
    const rowH = (bottom - y0) / 3;
    const hS = Math.min(...items.map((it) => oneLine(it.head, { w: tw, max: 17, min: 13, bold: true })));
    for (let i = 0; i < 3; i++) {
      const it = items[i], yc = y0 + rowH * (i + 0.5), dy = yc - cy;
      const ix = cx + Math.sqrt(Math.max(0, Rr * Rr - dy * dy));
      const ex = cx + Math.sqrt(Math.max(0, r * r - dy * dy)) + 0.18;
      if (ix - d / 2 - ex > 0.15) line(slide, ex, yc, ix - d / 2 - ex - 0.08, 0, COLOR.blueG, 1, "sysDot");
      await iconDot(slide, it.icon, ICONS3[i], ix, yc, d, i === 1 ? COLOR.camel : COLOR.blue);
      const bH = H(it.body, { w: tw, fontSize: 13 });
      const inner = 0.44 + 0.06 + bH, yy = yc - inner / 2;
      head(slide, it.head, { x: tx, y: yy, w: tw, h: 0.44, fontSize: hS, noBalance: true });
      text(slide, it.body, { x: tx, y: yy + 0.5, w: tw, h: bH, fontSize: 13 });
    }
    if (s.conclusion) conclusionLine(slide, s.conclusion, 6.35, { center: true });
  }
}

/* ---------- 4 要点 ---------- */
async function points4(s) {
  const layout = ctx.pickLayout(s, ["tiles", "chevrons"]);
  const slide = add(s);
  const items = s.items;
  const y0 = top(slide, s);
  const bottom = s.conclusion ? 6.2 : 6.95;
  if (layout === "tiles") {
    const g = 0.12, t = clamp((bottom - y0 - g) / 2 - 0.12, 1.15, 1.45), cy = (y0 + bottom) / 2;
    const dia = (2 * t + g) * 1.12;
    shape(slide, "RECTANGLE", CX - dia / 2, cy - dia / 2, dia, dia, "F1F1F1", { rotate: 45, name: "菱形装饰static" });
    const pos = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; // 01 左上、02 右上、03 右下、04 左下（顺时针）
    const fills = [COLOR.camelD, COLOR.blue, COLOR.camelD, COLOR.blue];
    const bw = 3.95;
    const hS = Math.min(...items.map((it) => oneLine(it.head, { w: bw, max: 18, min: 14, bold: true })));
    const bodyH = Math.max(...items.map((it) => H(it.body, { w: bw, fontSize: 13 })));
    for (let i = 0; i < 4; i++) {
      const [sx, sy] = pos[i];
      const x = sx < 0 ? CX - g / 2 - t : CX + g / 2, y = sy < 0 ? cy - g / 2 - t : cy + g / 2;
      round(slide, x, y, t, t, fills[i], { radius: 0.2, name: "方块" });
      await iconImg(slide, items[i].icon, COLOR.white, x + t / 2 - 0.17, y + t * 0.2, 0.34, ICONS4[i]);
      text(slide, num2(i), { x, y: y + t * 0.42, w: t, h: t * 0.45, fontSize: Math.round(t * 22), fontFace: FONT.title, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
      const bx = sx < 0 ? L : R - bw, align = sx < 0 ? "left" : "right";
      const inner = 0.46 + 0.08 + bodyH, by = clamp(y + t / 2 - inner / 2, y0, bottom - inner);
      head(slide, items[i].head, { x: bx, y: by, w: bw, h: 0.46, fontSize: hS, align, noBalance: true });
      text(slide, items[i].body, { x: bx, y: by + 0.54, w: bw, h: bodyH, fontSize: 13, align });
    }
  } else { // chevrons
    const step = (CWID - 3.0) / 3, chW = 3.0 + 0.0, chH = 0.78;
    const hS = Math.min(...items.map((it) => oneLine(it.head, { w: chW - 1.0, max: 17, min: 12, bold: true })));
    const bw = 2.55;
    const bodyH = Math.max(...items.map((it) => H(it.body, { w: bw, fontSize: 13 })));
    const blk = 0.4 + 0.1 + bodyH, cyc = (y0 + bottom) / 2;
    for (let i = 0; i < 4; i++) {
      const it = items[i], x = L + i * step;
      shape(slide, i === 0 ? "PENTAGON" : "CHEVRON", x, cyc - chH / 2, chW, chH, alt(i + 1), { name: "箭头条" });
      head(slide, it.head, { x: x + (i === 0 ? 0.3 : 0.55), y: cyc - chH / 2, w: chW - (i === 0 ? 0.85 : 1.1), h: chH, fontSize: hS, color: COLOR.white, align: "center", noBalance: true });
      const lx = x + (i === 0 ? 0.3 : 0.55), up = i % 2 === 1;
      const by = up ? cyc - chH / 2 - 0.3 - blk : cyc + chH / 2 + 0.3;
      const l0 = up ? by - 0.15 : cyc + chH / 2 + 0.05, l1 = up ? cyc - chH / 2 - 0.05 : by + blk + 0.15;
      line(slide, lx, l0, 0, l1 - l0, i % 2 ? COLOR.blueG : COLOR.camel, 1, "sysDot");
      await iconImg(slide, it.icon, alt(i + 1), lx + 0.2, by, 0.38, ICONS4[i]);
      text(slide, it.body, { x: lx + 0.2, y: by + 0.5, w: bw, h: bodyH, fontSize: 13 });
    }
  }
  if (s.conclusion) conclusionLine(slide, s.conclusion, 6.35, { center: true });
}

/* ---------- 对比 ---------- */
async function compare(s) {
  const layout = ctx.pickLayout(s, ["blocks", "banners"]);
  const slide = add(s);
  const sides = [s.left, s.right];
  const y0 = top(slide, s);
  const bottom = s.conclusion ? 6.2 : 6.95;
  if (layout === "blocks") {
    const W = 7.45, px = L + W + 0.25;
    await ctx.pic(slide, s, 0, px, y0, R - px, bottom - y0, { fallback: "photo_desk.jpg" });
    const gap = 0.14, bh = (bottom - y0 - gap) / 2;
    for (let k = 0; k < 2; k++) {
      const sd = sides[k], y = y0 + k * (bh + gap), fill = k ? COLOR.camelD : COLOR.blue;
      rect(slide, L, y, W, bh, fill, { name: "色块" });
      const n = sd.items.length, cols = n > 2 ? 2 : 1, rows = Math.ceil(n / cols);
      const rowH = Math.min(0.44, (bh - 1.05) / rows);
      const inner = 0.5 + 0.15 + rows * rowH;
      let yy = y + Math.max(0.2, (bh - inner) / 2);
      await iconImg(slide, sd.icon, COLOR.white, L + 0.45, yy + 0.07, 0.36, k ? "thumbs-up" : "alert-circle");
      head(slide, sd.head, { x: L + 0.95, y: yy, w: W - 1.6, h: 0.5, fontSize: oneLine(sd.head, { w: W - 1.6, max: 20, min: 14, bold: true }), color: COLOR.white, noBalance: true });
      yy += 0.5 + 0.15;
      const iw = (W - 0.9 - (cols - 1) * 0.3) / cols;
      sd.items.forEach((it, i) => {
        const c = Math.floor(i / rows), r = i % rows, x = L + 0.45 + c * (iw + 0.3), iy = yy + r * rowH;
        oval(slide, x, iy + rowH / 2 - 0.05, 0.1, COLOR.white, { name: "圆点装饰static" });
        text(slide, it, { x: x + 0.25, y: iy, w: iw - 0.25, h: rowH, fontSize: oneLine(it, { w: iw - 0.25, max: 13.5, min: 11 }), color: COLOR.white, valign: "middle", noBalance: true });
      });
    }
    const vd = 0.72, vy = y0 + bh + gap / 2 - vd / 2;
    oval(slide, L + W - vd / 2, vy, vd, COLOR.white, { line: COLOR.camel, lw: 2, name: "VS圆" });
    text(slide, "VS", { x: L + W - vd / 2, y: vy, w: vd, h: vd, fontSize: 16, bold: true, color: COLOR.blue, align: "center", valign: "middle", noBalance: true, fontFace: FONT.serif });
  } else { // banners
    const colW = 5.6, xs = [L, R - colW];
    const nMax = Math.max(sides[0].items.length, sides[1].items.length), rowH = 0.6;
    const groupH = 0.66 + 0.35 + nMax * rowH;
    const gy = y0 + Math.max(0, (bottom - y0 - groupH) * 0.4);
    line(slide, CX, gy, 0, groupH, COLOR.line, 1, "dash");
    for (let k = 0; k < 2; k++) {
      const sd = sides[k], x = xs[k], fill = k ? COLOR.camelD : COLOR.blue;
      const hs = oneLine(sd.head, { w: colW - 1.6, max: 18, min: 13, bold: true });
      const bw = clamp(longest(sd.head, { fontSize: hs, bold: true }) + 1.5, 2.6, colW);
      shape(slide, "PENTAGON", x, gy, bw, 0.66, fill, { name: "箭头标签" });
      await iconImg(slide, sd.icon, COLOR.white, x + 0.28, gy + 0.15, 0.36, k ? "thumbs-up" : "alert-circle");
      head(slide, sd.head, { x: x + 0.8, y: gy, w: bw - 1.15, h: 0.66, fontSize: hs, color: COLOR.white, noBalance: true });
      sd.items.forEach((it, i) => {
        const iy = gy + 0.66 + 0.35 + i * rowH;
        oval(slide, x + 0.12, iy + rowH / 2 - 0.07, 0.14, k ? COLOR.camel : COLOR.blue, { name: "圆点装饰static" });
        text(slide, it, { x: x + 0.45, y: iy, w: colW - 0.45, h: rowH, fontSize: oneLine(it, { w: colW - 0.45, max: 15, min: 12 }), valign: "middle", noBalance: true });
        line(slide, x, iy + rowH, colW, 0, COLOR.line, 0.75);
      });
    }
  }
  if (s.conclusion) conclusionLine(slide, s.conclusion, 6.35, { center: true });
}

/* ---------- 数据 ---------- */
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
const SERIES = [COLOR.camel, COLOR.blue, COLOR.camelL, COLOR.blueG];
async function stats(s) {
  const data = chartData(s);
  const layout = ctx.pickLayout(s, s.chart && data ? ["chart", "bubbles", "cards"] : data ? ["bubbles", "cards", "chart"] : ["bubbles", "cards"]);
  const slide = add(s);
  const y0 = top(slide, s);
  const items = s.items, n = items.length;
  if (layout === "bubbles") {
    const bottom = 6.5, k = Math.min(1, (bottom - y0) / 4.05);
    const cy = (y0 + bottom) / 2 + 0.02;
    const P = [[-0.95, -1.05, 1.8, COLOR.blue], [0.78, -0.12, 2.15, COLOR.camelD], [-1.12, 0.62, 1.55, COLOR.camelL], [0.12, 1.38, 1.25, COLOR.blue]];
    const used = P.slice(0, n), mx = (Math.min(...used.map((p) => p[0] - p[2] / 2)) + Math.max(...used.map((p) => p[0] + p[2] / 2))) / 2;
    const vS = Math.min(...items.map((it, i) => FIT(it.value, { w: P[i][2] * k * 0.78, h: P[i][2] * k * 0.42, max: 36, min: 16, bold: true })));
    items.forEach((it, i) => {
      const [dx, dy, dd, fill] = P[i], d = dd * k, cx = CX + (dx - mx) * k, ccy = cy + dy * k;
      oval(slide, cx - d / 2, ccy - d / 2, d, fill, { name: "数据圆" });
      const fs = Math.min(vS * (dd / 1.55), FIT(it.value, { w: d * 0.8, h: d * 0.45, max: 40, min: 16, bold: true }));
      text(slide, it.value, { x: cx - d / 2 + 0.05, y: ccy - d * 0.25, w: d - 0.1, h: d * 0.5, fontSize: fs, bold: true, color: fill === COLOR.camelL ? COLOR.blueD : COLOR.white, align: "center", valign: "middle", noBalance: true });
      const left = cx < CX, lw = 3.5;
      const lx = left ? Math.min(cx - d / 2 - 0.5, 4.7) - lw : Math.max(cx + d / 2 + 0.5, 8.6);
      const lh = H(it.label, { w: lw, fontSize: 15, bold: true, lineSpacingMultiple: 1.2 });
      line(slide, left ? lx + lw + 0.08 : cx + d / 2 + 0.08, ccy, left ? cx - d / 2 - lx - lw - 0.16 : lx - cx - d / 2 - 0.16, 0, COLOR.line, 1, "sysDot");
      text(slide, it.label, { x: lx, y: ccy - lh / 2, w: lw, h: lh, fontSize: 15, bold: true, color: COLOR.blue, align: left ? "right" : "left", lineSpacingMultiple: 1.2 });
    });
    sourceLine(slide, s, L, 6.7, CWID, "center");
  } else if (layout === "cards") {
    const gap = 0.35, cw = (CWID - (n - 1) * gap) / n;
    const vS = Math.min(...items.map((it) => FIT(it.value, { w: cw - 0.4, h: 0.95, max: 46, min: 24, bold: true })));
    const lH = Math.max(...items.map((it) => H(it.label, { w: cw - 0.5, fontSize: 14 })));
    const topH = 1.65, ch = topH + 0.35 + lH + 0.4;
    const cy = y0 + Math.max(0, (6.35 - y0 - ch) * 0.45);
    items.forEach((it, i) => {
      const x = L + i * (cw + gap), fill = i % 2 ? COLOR.camelD : COLOR.blue;
      rect(slide, x, cy, cw, ch, COLOR.white, { line: COLOR.line, lw: 0.75, name: "卡片" });
      rect(slide, x, cy, cw, topH, fill, { name: "色块" });
      text(slide, it.value, { x: x + 0.2, y: cy + 0.25, w: cw - 0.4, h: 1.0, fontSize: vS, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
      rect(slide, x + cw / 2 - 0.25, cy + 1.32, 0.5, 0.04, COLOR.white, { name: "线条装饰static", tr: 30 });
      text(slide, it.label, { x: x + 0.25, y: cy + topH + 0.35, w: cw - 0.5, h: lH, fontSize: 14, align: "center" });
    });
    sourceLine(slide, s, L, cy + ch + 0.25, CWID, "center");
  } else { // chart
    const X = L, W = 4.6, step = n > 3 ? 0.95 : 1.1;
    let y = y0 + 0.1;
    const vS = Math.min(...items.map((it) => FIT(it.value, { w: 1.95, h: 0.62, max: 30, min: 18, bold: true })));
    items.forEach((it, i) => {
      rect(slide, X, y + 0.18, 0.09, step - 0.46, SERIES[i % 2], { name: "色条" });
      text(slide, it.value, { x: X + 0.25, y, w: 1.95, h: step - 0.1, fontSize: vS, bold: true, color: i % 2 ? COLOR.blue : COLOR.camelT, valign: "middle", noBalance: true });
      text(slide, it.label, { x: X + 2.3, y, w: W - 2.3, h: step - 0.1, fontSize: 13, valign: "middle" });
      y += step;
    });
    sourceLine(slide, s, X, Math.max(y + 0.15, 6.0), W);
    const bx = 5.85, bw = R - bx, bh = 6.85 - y0;
    rect(slide, bx, y0, bw, bh, COLOR.camelLL, { name: "图表底" });
    const d = data || { labels: items.map((i) => i.label), values: items.map(() => 0) };
    const max = Math.max(...d.values);
    slide.addChart(ctx.charts.BAR, [{ name: s.chart?.unit || "数值", labels: d.labels, values: d.values }], {
      x: bx + 0.3, y: y0 + 0.25, w: bw - 0.6, h: bh - 0.5, barDir: "col", barGapWidthPct: 70,
      chartColors: d.values.map((_, i) => (i % 2 ? COLOR.blue : COLOR.camel)),
      showTitle: !!s.chart?.title, title: s.chart?.title || "", titleColor: COLOR.ink, titleFontSize: 13, titleFontFace: FONT.body,
      showValue: true, dataLabelPosition: "outEnd", dataLabelColor: COLOR.ink, dataLabelFontSize: 13, dataLabelFontBold: true, dataLabelFontFace: FONT.body,
      catAxisLabelColor: COLOR.ink, catAxisLabelFontSize: 11, catAxisLabelFontFace: FONT.body, catAxisLineShow: true, catAxisLineColor: "BFBFBF",
      valAxisHidden: true, valAxisMinVal: 0, valAxisMaxVal: max > 0 ? max * 1.18 : 1,
      valGridLine: { style: "none" }, catGridLine: { style: "none" }, showLegend: false,
      altText: `柱状图：${d.labels.map((l, i) => `${l} ${d.values[i]}`).join("、")}`,
    });
  }
}

/* ---------- 时间线 ---------- */
async function timeline(s) {
  const layout = ctx.pickLayout(s, ["chevrons", "vertical"]);
  const slide = add(s);
  const y0 = top(slide, s);
  const bottom = s.conclusion ? 6.2 : 6.95;
  const items = s.items, n = items.length;
  if (layout === "chevrons") {
    const ov = 0.2, chW = (CWID + (n - 1) * ov) / n, step = chW - ov, chH = 0.72;
    const tS = Math.min(...items.map((it) => oneLine(it.time, { w: chW - 1.0, max: 16, min: 11, bold: true })));
    const cw = step - 0.15;
    const hS = Math.min(...items.map((it) => oneLine(it.head, { w: cw - 0.2, max: 17, min: 13, bold: true })));
    const bodyH = Math.max(0, ...items.map((it) => (it.body ? H(it.body, { w: cw - 0.2, fontSize: 13 }) : 0)));
    const group = chH + 0.35 + 0.46 + (bodyH ? 0.1 + bodyH : 0);
    const gy = y0 + Math.max(0, (bottom - y0 - group) * 0.4);
    items.forEach((it, i) => {
      const x = L + i * step;
      shape(slide, i === 0 ? "PENTAGON" : "CHEVRON", x, gy, chW, chH, alt(i + 1), { name: "箭头条" });
      text(slide, it.time, { x: x + (i === 0 ? 0.25 : 0.5), y: gy, w: chW - (i === 0 ? 0.75 : 1.0), h: chH, fontSize: tS, bold: true, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
      const tx = x + (i === 0 ? 0.1 : 0.35);
      oval(slide, tx, gy + chH + 0.35 + 0.17, 0.12, i % 2 ? COLOR.camel : COLOR.blue, { name: "圆点装饰static" });
      head(slide, it.head, { x: tx + 0.22, y: gy + chH + 0.35, w: cw - 0.3, h: 0.46, fontSize: hS, noBalance: true });
      if (it.body) text(slide, it.body, { x: tx + 0.22, y: gy + chH + 0.35 + 0.56, w: cw - 0.3, h: H(it.body, { w: cw - 0.3, fontSize: 13 }), fontSize: 13 });
    });
  } else { // vertical
    const rowH = Math.min(1.0, (bottom - y0) / n), gy = y0 + Math.max(0, (bottom - y0 - n * rowH) * 0.4);
    const lx = 3.45, tw = 2.4, hx = lx + 0.45, hw = 2.6, bx = hx + hw + 0.2, bw = R - bx;
    const tS = Math.min(...items.map((it) => oneLine(it.time, { w: tw, max: 22, min: 13, bold: true })));
    const hS = Math.min(...items.map((it) => oneLine(it.head, { w: hw, max: 17, min: 13, bold: true })));
    line(slide, lx, gy + rowH / 2, 0, (n - 1) * rowH, COLOR.camel, 1.25, "sysDot");
    items.forEach((it, i) => {
      const cy = gy + i * rowH + rowH / 2;
      text(slide, it.time, { x: lx - 0.35 - tw, y: cy - 0.3, w: tw, h: 0.6, fontSize: tS, bold: true, fontFace: FONT.head, color: i % 2 ? COLOR.blue : COLOR.camelT, align: "right", valign: "middle", noBalance: true });
      oval(slide, lx - 0.13, cy - 0.13, 0.26, i % 2 ? COLOR.blue : COLOR.camel, { line: COLOR.white, lw: 2, name: "节点" });
      head(slide, it.head, { x: hx, y: cy - 0.25, w: hw, h: 0.5, fontSize: hS, noBalance: true });
      if (it.body) text(slide, it.body, { x: bx, y: cy - 0.25, w: bw, h: 0.5, fontSize: oneLine(it.body, { w: bw, max: 13.5, min: 11 }), valign: "middle", noBalance: true });
      if (i < n - 1) line(slide, hx, cy + rowH / 2, R - hx, 0, "EDEDED", 0.75);
    });
  }
  if (s.conclusion) conclusionLine(slide, s.conclusion, 6.35, { center: true });
}

/* ---------- 大图配文 ---------- */
async function imageText(s) {
  const layout = ctx.pickLayout(s, ["banner", "panel"]);
  const slide = add(s);
  const pts = s.points || [];
  if (layout === "banner") {
    const X = 6.2, W = R - X;
    const eb = eyebrowOf(s);
    const bodyS = 13, bH = H(s.body, { w: W, fontSize: bodyS });
    const ptH = pts.map((p) => Math.max(0.5, H(p, { w: W - 0.75, fontSize: 13 })));
    const cH = s.conclusion ? H(s.conclusion, { w: W - 0.25, fontSize: 15, bold: true, lineSpacingMultiple: 1.2 }) : 0;
    const below = ptH.reduce((a, h) => a + h + 0.15, 0) + (cH ? 0.15 + cH : 0);
    const need = 0.4 + (eb ? 0.36 : 0) + 0.62 + 0.18 + bH + 0.4;
    const bandH = Math.max(need, 2.5, below ? 0 : 4.3);
    const by = 0.55;
    rect(slide, 0, by, CW, bandH, COLOR.blue, { name: "色带" });
    const ph = Math.max(4.4, bandH + 0.9);
    rect(slide, L - 0.08, by + 0.27, 5.06, ph + 0.16, COLOR.white, { name: "相框装饰static" });
    await ctx.pic(slide, s, 0, L, by + 0.35, 4.9, ph, { fallback: "photo_laptop.jpg" });
    let y = by + Math.max(0.4, (bandH - (need - 0.8)) / 2);
    if (eb) { text(slide, eb, { x: X, y, w: W, h: 0.3, fontSize: oneLine(eb, { w: W, max: 12, min: 10, bold: true }), bold: true, charSpacing: 1, color: COLOR.camelL, valign: "middle", noBalance: true }); y += 0.36; }
    head(slide, s.title, { x: X, y, w: W, h: 0.62, fontSize: oneLine(s.title, { w: W, max: 26, min: 18, bold: true }), color: COLOR.white, noBalance: true });
    y += 0.62 + 0.18;
    text(slide, s.body, { x: X, y, w: W, h: bH, fontSize: bodyS, color: COLOR.white });
    y = by + bandH + 0.4;
    const icons = ["check", "star", "flag"];
    for (let i = 0; i < pts.length; i++) {
      await iconDot(slide, icons[i], "check", X + 0.25, y + ptH[i] / 2, 0.5, COLOR.camel);
      text(slide, pts[i], { x: X + 0.75, y, w: W - 0.75, h: ptH[i], fontSize: 13, valign: "middle" });
      y += ptH[i] + 0.15;
    }
    if (s.conclusion) conclusionLine(slide, s.conclusion, y + 0.05, { x: X, w: W });
  } else { // panel
    const top0 = 0.6, bot = 6.9, ph = bot - top0;
    await ctx.pic(slide, s, 0, L, top0, 4.0, ph, { fallback: "photo_wreath.jpg" });
    const hasRight = pts.length || s.conclusion;
    const px = L + 4.0 + 0.2, pw = hasRight ? 3.75 : R - px;
    rect(slide, px, top0, pw, ph, COLOR.camel, { name: "驼色面板" });
    const ix = px + 0.4, iw = pw - 0.8, eb = eyebrowOf(s);
    const tS = FIT(s.title, { w: iw, h: 1.3, max: 26, min: 18, bold: true });
    const tt = evenBreak(s.title, { w: iw, fontSize: tS, bold: true, lineSpacingMultiple: 1.1 });
    const tH = H(tt, { w: iw, fontSize: tS, bold: true, lineSpacingMultiple: 1.1 });
    let bS = 13; while (bS > 11 && H(s.body, { w: iw, fontSize: bS }) > ph - 1.9 - tH) bS -= 0.5;
    const bH = H(s.body, { w: iw, fontSize: bS });
    const ebS = eb ? oneLine(eb, { w: iw, max: 12, min: 10, bold: true, charSpacing: 1 }) : 0;
    const ebH = eb ? Math.max(0.32, H(eb, { w: iw, fontSize: ebS, bold: true, charSpacing: 1, lineSpacingMultiple: 1.15 })) : 0;
    const inner = (eb ? ebH + 0.08 : 0) + tH + 0.25 + 0.05 + 0.25 + bH;
    let y = top0 + Math.max(0.4, (ph - inner) * 0.4);
    if (eb) { text(slide, eb, { x: ix, y, w: iw, h: ebH, fontSize: ebS, bold: true, charSpacing: 1, color: COLOR.camelInk, valign: "middle", lineSpacingMultiple: 1.15, noBalance: true }); y += ebH + 0.08; }
    head(slide, tt, { x: ix, y, w: iw, h: tH, fontSize: tS, color: COLOR.camelInk, valign: "top" });
    y += tH + 0.25;
    rect(slide, ix, y, 0.6, 0.05, COLOR.white, { name: "线条装饰static" });
    y += 0.3;
    text(slide, s.body, { x: ix, y, w: iw, h: bH, fontSize: bS, color: COLOR.camelInk });
    if (hasRight) {
      const X = px + pw + 0.45, W = R - X;
      const pH = pts.map((p) => H(p, { w: W - 0.4, fontSize: 13 }));
      const cH = s.conclusion ? H(s.conclusion, { w: W - 0.25, fontSize: 15, bold: true, lineSpacingMultiple: 1.2 }) : 0;
      const total = pH.reduce((a, h) => a + h + 0.45, 0) + (cH ? 0.2 + cH : 0);
      let yy = top0 + Math.max(0.2, (ph - total) / 2);
      if (pts.length > 1) line(slide, X + 0.09, yy + 0.12, 0, pH.slice(0, -1).reduce((a, h) => a + h + 0.45, 0), COLOR.camel, 1, "sysDot");
      pts.forEach((p, i) => {
        oval(slide, X, yy + 0.03, 0.18, COLOR.camel, { name: "圆点装饰static" });
        text(slide, p, { x: X + 0.4, y: yy, w: W - 0.4, h: pH[i], fontSize: 13 });
        yy += pH[i] + 0.45;
      });
      if (s.conclusion) conclusionLine(slide, s.conclusion, yy + (pts.length ? -0.25 : 0), { x: X, w: W });
    }
  }
}

/* ---------- 金句 ---------- */
async function quote(s) {
  const layout = ctx.pickLayout(s, ["wash", "photo"]);
  if (layout === "wash") {
    const slide = add(s, "soft");
    const W = 9.4;
    const size = FIT(s.text, { w: W, h: 2.5, max: 40, min: 26, lineSpacingMultiple: 1.3 });
    const qt = evenBreak(s.text, { w: W, fontSize: size, lineSpacingMultiple: 1.3 });
    const h = H(qt, { w: W, fontSize: size, lineSpacingMultiple: 1.3 });
    const y = Math.max(2.1, 3.75 - h / 2 - (s.author ? 0.3 : 0));
    text(slide, "“", { x: CX - 0.7, y: y - 1.45, w: 1.4, h: 1.3, fontSize: 96, color: COLOR.camel, fontFace: FONT.serif, align: "center", valign: "top", noBalance: true, objectName: "引号装饰static" });
    light(slide, qt, { x: CX - W / 2, y, w: W, h, fontSize: size, align: "center", lineSpacingMultiple: 1.3 });
    if (s.author) {
      const a = "—— " + s.author, fs = oneLine(a, { w: 7, max: 16, min: 12 });
      duoBar(slide, CX, y + h + 0.3, true);
      text(slide, a, { x: CX - 3.5, y: y + h + 0.5, w: 7, h: 0.42, fontSize: fs, color: COLOR.blueG, align: "center", valign: "middle", noBalance: true });
    }
  } else { // photo
    const slide = add(s);
    await ctx.pic(slide, s, 0, 0, 0, 5.4, 7.5, { fallback: "photo_tower.jpg" });
    rect(slide, 5.4, 0, CW - 5.4, 7.5, COLOR.blue, { name: "深蓝面板" });
    const X = 6.3, W = R - X + 0.2;
    const size = FIT(s.text, { w: W, h: 3.0, max: 36, min: 24, lineSpacingMultiple: 1.3 });
    const qt = evenBreak(s.text, { w: W, fontSize: size, lineSpacingMultiple: 1.3 });
    const h = H(qt, { w: W, fontSize: size, lineSpacingMultiple: 1.3 });
    const y = Math.max(2.0, 3.85 - h / 2 - (s.author ? 0.3 : 0));
    text(slide, "“", { x: X - 0.1, y: y - 1.35, w: 1.4, h: 1.25, fontSize: 90, color: COLOR.camel, fontFace: FONT.serif, valign: "top", noBalance: true, objectName: "引号装饰static" });
    light(slide, qt, { x: X, y, w: W, h, fontSize: size, color: COLOR.white, lineSpacingMultiple: 1.3 });
    if (s.author) {
      rect(slide, X, y + h + 0.35, 0.6, 0.05, COLOR.camel, { name: "线条装饰static" });
      text(slide, s.author, { x: X, y: y + h + 0.55, w: W, h: 0.42, fontSize: oneLine(s.author, { w: W, max: 16, min: 12 }), color: COLOR.camelL, valign: "middle", noBalance: true });
    }
  }
}

/* ---------- 结尾 ---------- */
async function closing(s) {
  ctx.pickLayout(s, ["thanks"]);
  const slide = add(s, "wash");
  const W = 10.6;
  const t = titleLines(s.title, W);
  const tH = titleH(t);
  const bH = H(s.body, { w: 8.6, fontSize: 14 });
  const total = 0.5 + 0.15 + tH + 0.28 + 0.05 + (bH ? 0.3 + bH : 0);
  let y = Math.max(0.7, 3.6 - total / 2);
  y += quoteTag(slide, s.tag || "THANK YOU", y) + 0.15;
  light(slide, t.text, { x: CX - W / 2, y, w: W, h: tH, fontSize: t.size, align: "center" });
  y += tH + 0.28;
  duoBar(slide, CX, y, true);
  y += 0.05;
  if (bH) text(slide, s.body, { x: CX - 4.3, y: y + 0.3, w: 8.6, h: bH, fontSize: 14, color: COLOR.blueD, align: "center" });
}

/* ---------- 表格（可选） ---------- */
async function table(s) {
  ctx.pickLayout(s, ["grid"]);
  const slide = add(s);
  const y0 = top(slide, s);
  const rows = s.rows || [], cols = s.columns || [];
  const rowH = rows.length > 4 ? 0.6 : 0.68, headH = 0.58, tw = CWID;
  const b = (pt, c) => ({ type: "solid", pt, color: c }), n = { type: "none" };
  const Hd = (t) => ({ text: t, options: { bold: true, fontSize: 14, color: COLOR.white, fill: { color: COLOR.blue }, border: [n, n, n, n] } });
  const Cl = (t, j, r) => ({ text: t ?? "", options: { bold: j === 0, color: j === 0 ? COLOR.blue : COLOR.ink, fill: { color: r % 2 ? COLOR.camelLL : COLOR.white }, border: [n, n, b(0.75, COLOR.camelL), n] } });
  const len = (t) => [...String(t ?? "")].reduce((a, ch) => a + (ch.charCodeAt(0) < 0x2000 ? 0.55 : 1), 0);
  const weight = cols.map((c, j) => Math.max(2, len(c), ...rows.map((r) => len(r[j]))));
  let colW = weight.map((w) => (tw * w) / weight.reduce((a, c) => a + c, 0));
  const short = colW.map((w) => Math.max(1.3, w)), extra = short.reduce((a, c) => a + c, 0) - tw;
  if (extra > 0) { const wide = short.map((w, j) => (colW[j] > 1.3 ? w : 0)), sum = wide.reduce((a, c) => a + c, 0); colW = short.map((w, j) => (wide[j] ? w - (extra * w) / sum : w)); }
  const tH = headH + rows.length * rowH, cH = s.conclusion ? 0.3 + H(s.conclusion, { w: CWID - 0.25, fontSize: 15, bold: true, lineSpacingMultiple: 1.2 }) : 0;
  const ty = y0 + Math.max(0, (6.85 - y0 - tH - cH) * 0.35);
  rect(slide, L, ty, 0.12, headH, COLOR.camel, { name: "表头装饰static" });
  slide.addTable([cols.map(Hd), ...rows.map((r, i) => cols.map((_, j) => Cl(r[j], j, i)))], {
    x: L, y: ty, w: tw, colW, rowH: [headH, ...rows.map(() => rowH)],
    fontSize: 12.5, color: COLOR.ink, fontFace: FONT.body, margin: [0.04, 0.15, 0.04, 0.22], valign: "middle",
  });
  if (s.conclusion) conclusionLine(slide, s.conclusion, ty + tH + 0.3);
}

/* ---------- 步骤（可选） ---------- */
async function steps(s) {
  ctx.pickLayout(s, ["tiles"]);
  const slide = add(s);
  const y0 = top(slide, s, { minTop: 1.85 });
  const items = s.items, n = items.length, gap = 0.6, cw = (CWID - (n - 1) * gap) / n;
  const hS = Math.min(...items.map((it) => oneLine(it.head, { w: cw - 0.5, max: 18, min: 13, bold: true })));
  const bodyH = Math.max(...items.map((it) => H(it.body, { w: cw - 0.5, fontSize: 13.5 })));
  const t = 0.95, ch = 0.75 + 0.5 + 0.15 + bodyH + 0.4;
  const cy = y0 + t / 2 + Math.max(0, (6.75 - y0 - t / 2 - ch) * 0.4);
  for (let i = 0; i < n; i++) {
    const it = items[i], x = L + i * (cw + gap);
    rect(slide, x, cy, cw, ch, COLOR.white, { line: COLOR.line, lw: 0.75, name: "卡片" });
    round(slide, x + 0.25, cy - t / 2, t, t, i % 2 ? COLOR.blue : COLOR.camelD, { radius: 0.16, name: "方块" });
    text(slide, num2(i), { x: x + 0.25, y: cy - t / 2, w: t, h: t, fontSize: 26, fontFace: FONT.title, color: COLOR.white, align: "center", valign: "middle", noBalance: true });
    head(slide, it.head, { x: x + 0.25, y: cy + 0.75, w: cw - 0.5, h: 0.5, fontSize: hS, noBalance: true });
    text(slide, it.body, { x: x + 0.25, y: cy + 0.75 + 0.5 + 0.15, w: cw - 0.5, h: bodyH, fontSize: 13.5 });
    if (i < n - 1) await iconImg(slide, "chevrons-right", COLOR.camel, x + cw + (gap - 0.36) / 2, cy + ch / 2 - 0.18, 0.36);
  }
}

/* ============================ 入口 ============================ */
async function render(deck, c) {
  ctx = c;
  const M = (title, file) => ctx.pres.defineSlideMaster({ title, background: { path: ctx.asset(file) }, objects: [] });
  M("WC_WASH", "bg_wash.jpg");
  M("WC_CONTENT", "bg_content.jpg");
  M("WC_SOFT", "bg_soft.jpg");
  ctx.pres.defineSlideMaster({ title: "WC_WHITE", background: { color: "FFFFFF" }, objects: [] });
  await ctx.renderAll({ cover, toc, section, points3, points4, compare, stats, timeline, imageText, quote, closing, table, steps });
}

module.exports = { render };
