/**
 * 给 .pptx 里的文字、图片、图表加"入场动画"（pptxgenjs 本身不支持）
 * 做法：解压 → 读取每页的元素 → 在 slideN.xml 末尾写入 <p:timing> 动画时间轴 → 重新打包
 *
 * 用法：
 *   const { addAnimations } = require("./animations");
 *   const plan = await addAnimations("deck.pptx", { trigger: "auto" });
 *   console.log(plan.summary);
 *
 * 规则：
 *   - 动画对象：文本框、图片、图表/表格；色块、线条、圆形等纯装饰形状保持静止
 *   - 按元素在页面里的先后顺序依次入场（代码里先 add 的先出来）
 *   - 名字匹配 skip 的元素不动（默认：叶影装饰、样机外框；在代码里给元素设 objectName 即可控制）
 *   - 每份 PPT 随机抽几种文字效果、几种图片效果；每页文字用一种、图片用一种，相邻两页不重复
 *
 * 选项：
 *   trigger   "auto"（默认，翻到这页后自动依次出现）| "click"（每点一下出现一个）
 *   dur       每个元素的动画时长，毫秒，默认 600
 *   stagger   相邻元素的出场间隔，毫秒，默认 220（元素很多时自动压缩，整页不超过 maxTotal）
 *   maxTotal  自动模式下整页入场的最长时间，毫秒，默认 2600
 *   textPick / imagePick   每份 PPT 抽几种：{ min, max }，默认文字 2~3、图片 2~3
 *   seed      随机种子（也可用环境变量 ANIMATION_SEED），同一种子得到同一套动画
 *   skip      不加动画的元素名正则，默认 /叶影|样机|static/
 */
const fs = require("fs");
const crypto = require("crypto");
const JSZip = require("module").createRequire(require.resolve("pptxgenjs"))("jszip");

/* ---------------- 效果库 ----------------
 * 每个效果 = PowerPoint 预设编号 + 生成动画行为的函数 b(spid, dur, next)
 * next() 分配时间节点 id
 */
const vis = (s, next) =>
  `<p:set><p:cBhvr><p:cTn id="${next()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>` +
  `<p:tgtEl><p:spTgt spid="${s}"/></p:tgtEl><p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr>` +
  `<p:to><p:strVal val="visible"/></p:to></p:set>`;
const filt = (s, d, f, next) =>
  `<p:animEffect transition="in" filter="${f}"><p:cBhvr><p:cTn id="${next()}" dur="${d}"/>` +
  `<p:tgtEl><p:spTgt spid="${s}"/></p:tgtEl></p:cBhvr></p:animEffect>`;
const prop = (s, d, attr, from, to, next, decel = true) =>
  `<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="${next()}" dur="${d}" fill="hold"${decel ? ' decel="100000"' : ""}/>` +
  `<p:tgtEl><p:spTgt spid="${s}"/></p:tgtEl><p:attrNameLst><p:attrName>${attr}</p:attrName></p:attrNameLst></p:cBhvr>` +
  `<p:tavLst><p:tav tm="0"><p:val><p:strVal val="${from}"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav></p:tavLst></p:anim>`;

const EFFECTS = {
  fade:      { name: "淡入",        id: 10, sub: 0,  for: ["text", "image"], b: (s, d, n) => vis(s, n) + filt(s, d, "fade", n) },
  floatUp:   { name: "浮入（上浮）", id: 42, sub: 0,  for: ["text", "image"],
               b: (s, d, n) => vis(s, n) + filt(s, d, "fade", n) + prop(s, d, "ppt_x", "#ppt_x", "#ppt_x", n) + prop(s, d, "ppt_y", "#ppt_y+.1", "#ppt_y", n) },
  floatDown: { name: "浮入（下沉）", id: 42, sub: 0,  for: ["text"],
               b: (s, d, n) => vis(s, n) + filt(s, d, "fade", n) + prop(s, d, "ppt_x", "#ppt_x", "#ppt_x", n) + prop(s, d, "ppt_y", "#ppt_y-.1", "#ppt_y", n) },
  wipeRight: { name: "擦除（自左）", id: 22, sub: 8,  for: ["text", "image"], b: (s, d, n) => vis(s, n) + filt(s, d, "wipe(right)", n) },
  wipeUp:    { name: "擦除（自底）", id: 22, sub: 4,  for: ["text", "image"], b: (s, d, n) => vis(s, n) + filt(s, d, "wipe(up)", n) },
  zoom:      { name: "缩放",        id: 53, sub: 16, for: ["image", "text"],
               b: (s, d, n) => vis(s, n) + prop(s, d, "ppt_w", "0", "#ppt_w", n) + prop(s, d, "ppt_h", "0", "#ppt_h", n) + filt(s, d, "fade", n) },
  split:     { name: "劈裂",        id: 16, sub: 37, for: ["image"], b: (s, d, n) => vis(s, n) + filt(s, d, "barn(outVertical)", n) },
  flyLeft:   { name: "飞入（自左）", id: 2,  sub: 8,  for: ["image"],
               b: (s, d, n) => vis(s, n) + prop(s, d, "ppt_x", "0-#ppt_w/2", "#ppt_x", n) + prop(s, d, "ppt_y", "#ppt_y", "#ppt_y", n) },
  flyUp:     { name: "飞入（自底）", id: 2,  sub: 4,  for: ["image"],
               b: (s, d, n) => vis(s, n) + prop(s, d, "ppt_x", "#ppt_x", "#ppt_x", n) + prop(s, d, "ppt_y", "1+#ppt_h/2", "#ppt_y", n) },
  circle:    { name: "形状（圆形）", id: 6,  sub: 32, for: ["image"], b: (s, d, n) => vis(s, n) + filt(s, d, "circle(out)", n) },
};
const TEXT_POOL = Object.keys(EFFECTS).filter((k) => EFFECTS[k].for.includes("text"));
const IMAGE_POOL = Object.keys(EFFECTS).filter((k) => EFFECTS[k].for.includes("image"));

/* ---------------- 随机 ---------------- */
function makeRng(seed) {
  if (seed === undefined || seed === null || seed === "") return Math.random;
  let h = crypto.createHash("sha256").update("anim:" + seed).digest().readUInt32LE(0);
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pickSet(pool, { min, max }, rng) {
  const lo = Math.max(1, Math.min(min, pool.length)), hi = Math.max(lo, Math.min(max, pool.length));
  const k = lo + Math.floor(rng() * (hi - lo + 1));
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}
const pickNot = (set, prev, rng) => { const o = set.length > 1 ? set.filter((e) => e !== prev) : set; return o[Math.floor(rng() * o.length)]; };

/* ---------------- 读取一页里的元素 ---------------- */
function listTargets(xml, skip) {
  const tree = xml.slice(xml.indexOf("<p:spTree>"), xml.indexOf("</p:spTree>"));
  const out = [];
  // 只看 spTree 的直接子元素：sp / pic / graphicFrame（pptxgenjs 不产生组合，不会嵌套）
  const re = /<p:(sp|pic|graphicFrame)>([\s\S]*?)<\/p:\1>/g;
  let m;
  while ((m = re.exec(tree))) {
    const [, tag, body] = m;
    const id = (body.match(/<p:cNvPr id="(\d+)"/) || [])[1];
    const name = (body.match(/<p:cNvPr id="\d+" name="([^"]*)"/) || [])[1] || "";
    if (!id || skip.test(name)) continue;
    if (tag === "sp") {
      if (!/<a:t>[^<]*\S[^<]*<\/a:t>/.test(body)) continue; // 没有文字的形状 = 装饰色块，保持静止
      out.push({ id, kind: "text" });
    } else if (tag === "pic") {
      out.push({ id, kind: "image" });
    } else {
      out.push({ id, kind: "graphic" }); // 图表 / 表格
    }
  }
  return out;
}

/* ---------------- 生成一页的 <p:timing> ---------------- */
function timingXml(targets, effectFor, { trigger, dur, stagger, maxTotal }) {
  let idc = 0;
  const next = () => ++idc;
  const rootId = next(), seqId = next();
  const gap = targets.length > 1 ? Math.min(stagger, Math.floor((maxTotal - dur) / (targets.length - 1))) : 0;
  const effectPar = (t, delay, nodeType) => {
    const key = effectFor(t);
    const e = EFFECTS[key];
    const cId = next();
    const grp = t.kind === "image" ? "" : ' grpId="0"';
    return `<p:par><p:cTn id="${cId}" presetID="${e.id}" presetClass="entr" presetSubtype="${e.sub}" fill="hold"${grp} nodeType="${nodeType}">` +
      `<p:stCondLst><p:cond delay="${delay}"/></p:stCondLst><p:childTnLst>${e.b(t.id, dur, next)}</p:childTnLst></p:cTn></p:par>`;
  };
  let groups = "";
  if (trigger === "click") {
    for (const t of targets) {
      const g = next(), inner = next();
      groups += `<p:par><p:cTn id="${g}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/></p:stCondLst><p:childTnLst>` +
        `<p:par><p:cTn id="${inner}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
        effectPar(t, 0, "clickEffect") + `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
    }
  } else {
    // 自动：翻到本页即开始（onBegin），各元素"与上一动画同时"+ 递增延迟，形成依次入场
    const g = next(), inner = next();
    const effects = targets.map((t, i) => effectPar(t, i * gap, i === 0 ? "afterEffect" : "withEffect")).join("");
    groups = `<p:par><p:cTn id="${g}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/>` +
      `<p:cond evt="onBegin" delay="0"><p:tn val="${seqId}"/></p:cond></p:stCondLst><p:childTnLst>` +
      `<p:par><p:cTn id="${inner}" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>` +
      effects + `</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>`;
  }
  const bld = targets.map((t) =>
    t.kind === "text" ? `<p:bldP spid="${t.id}" grpId="0" animBg="1"/>`
      : t.kind === "graphic" ? `<p:bldGraphic spid="${t.id}" grpId="0"><p:bldAsOne/></p:bldGraphic>` : "").join("");
  return `<p:timing><p:tnLst><p:par><p:cTn id="${rootId}" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>` +
    `<p:seq concurrent="1" nextAc="seek"><p:cTn id="${seqId}" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${groups}</p:childTnLst></p:cTn>` +
    `<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
    `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>` +
    `</p:childTnLst></p:cTn></p:par></p:tnLst>` + (bld ? `<p:bldLst>${bld}</p:bldLst>` : "") + `</p:timing>`;
}

/* ---------------- 主函数 ---------------- */
async function addAnimations(file, opts = {}) {
  const o = {
    trigger: "auto", dur: 600, stagger: 220, maxTotal: 2600,
    textPick: { min: 2, max: 3 }, imagePick: { min: 2, max: 3 },
    seed: process.env.ANIMATION_SEED, skip: /叶影|样机|static/,
    ...opts,
  };
  const rng = makeRng(o.seed);
  const textSet = pickSet(TEXT_POOL, o.textPick, rng);
  const imageSet = pickSet(IMAGE_POOL, o.imagePick, rng);

  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const pres = await zip.file("ppt/presentation.xml").async("string");
  const rels = await zip.file("ppt/_rels/presentation.xml.rels").async("string");
  const rIds = [...pres.matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
  const target = (rid) => rels.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`)).slice(1).find(Boolean);

  const perSlide = [];
  let prevText, prevImage, count = 0;
  for (let i = 0; i < rIds.length; i++) {
    const p = "ppt/" + target(rIds[i]).replace(/^\.?\/?/, "");
    let xml = await zip.file(p).async("string");
    xml = xml.replace(/<p:timing>[\s\S]*?<\/p:timing>/, ""); // 去掉旧动画
    const targets = listTargets(xml, o.skip);
    if (!targets.length) { zip.file(p, xml); perSlide.push(null); continue; }
    const tEff = pickNot(textSet, prevText, rng), iEff = pickNot(imageSet, prevImage, rng);
    prevText = tEff; prevImage = iEff;
    const effectFor = (t) => (t.kind === "image" ? iEff : t.kind === "graphic" ? "fade" : tEff);
    // <p:timing> 必须在 <p:transition> 之后、</p:sld> 之前
    const tx = timingXml(targets, effectFor, o);
    xml = xml.includes("<p:extLst>") && xml.lastIndexOf("<p:extLst>") > xml.lastIndexOf("</p:cSld>")
      ? xml.replace(/(<p:extLst>(?![\s\S]*<p:extLst>))/, tx + "$1")
      : xml.replace("</p:sld>", tx + "</p:sld>");
    zip.file(p, xml);
    count += targets.length;
    perSlide.push({ text: tEff, image: iEff, n: targets.length });
  }
  const out = new JSZip();
  for (const [name, f] of Object.entries(zip.files)) {
    if (!f.dir) out.file(name, await f.async("uint8array"), { createFolders: false });
  }
  fs.writeFileSync(file, await out.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));

  const nm = (k) => EFFECTS[k].name;
  const summary =
    `[动画] 触发：${o.trigger === "click" ? "点击逐个出现" : "翻页后自动依次出现"}，共 ${count} 个元素\n` +
    `[动画] 文字效果抽中：${textSet.map(nm).join("、")}；图片效果抽中：${imageSet.map(nm).join("、")}` + (o.seed ? `  种子=${o.seed}` : "") + "\n" +
    "[动画] 逐页（文字/图片）：" + perSlide.map((s, i) => s ? `${i + 1}.${nm(s.text)}/${nm(s.image)}` : `${i + 1}.无`).join("  ");
  return { textSet, imageSet, perSlide, summary };
}

module.exports = { addAnimations, EFFECTS, TEXT_POOL, IMAGE_POOL };
