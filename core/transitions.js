/**
 * 给 pptxgenjs 生成的 .pptx 加页面切换效果（pptxgenjs 本身不支持）
 * 做法：解压 → 在每页 slideN.xml 的 </p:clrMapOvr> 之后插入 <p:transition> → 重新打包
 *
 * 两种用法：
 *   1) 随机：从 20 种效果里随机抽 3~5 种，逐页分配，相邻两页不重复
 *        const plan = randomPlan(totalSlides, { min: 3, max: 5 });
 *        await addTransitions("deck.pptx", (n) => plan.plan[n - 1]);
 *   2) 固定：自己决定每页用哪个
 *        await addTransitions("deck.pptx", (n, total) => n === 1 ? "fade" : "push");
 *
 * 想复现某一次随机结果：运行前设环境变量 TRANSITION_SEED=任意文字（同一个种子 → 同一套效果）
 *
 * 兼容性：标 2010 / 2013 的效果需要 PowerPoint 2010 / 2013 及以上；
 *         旧版本或不支持的软件（部分 WPS 版本等）会自动退回"淡入淡出"，不会报错。
 */
const fs = require("fs");
const crypto = require("crypto");
const JSZip = require("module").createRequire(require.resolve("pptxgenjs"))("jszip");

const NS_MC = "http://schemas.openxmlformats.org/markup-compatibility/2006";
const NS_P14 = "http://schemas.microsoft.com/office/powerpoint/2010/main";
const NS_P15 = "http://schemas.microsoft.com/office/powerpoint/2012/main";

/**
 * 20 种效果（随机池）
 *   ms    动画时长（毫秒）
 *   basic 所有版本都能读的写法；rich 新版写法（ns 指定需要的版本），旧版退回 basic
 */
const EFFECTS = {
  // —— 经典效果（所有版本） ——
  fade:      { name: "淡入淡出",   ms: 1000, basic: "<p:fade/>" },
  fadeBlack: { name: "经黑场淡出", ms: 1400, basic: '<p:fade thruBlk="1"/>' },
  push:      { name: "推进",       ms: 800,  basic: '<p:push dir="l"/>' },
  wipe:      { name: "擦除",       ms: 900,  basic: '<p:wipe dir="l"/>' },
  split:     { name: "分割",       ms: 900,  basic: '<p:split orient="vert" dir="out"/>' },
  cover:     { name: "覆盖",       ms: 800,  basic: '<p:cover dir="l"/>' },
  uncover:   { name: "揭开",       ms: 800,  basic: '<p:pull dir="l"/>' },
  zoom:      { name: "缩放",       ms: 900,  basic: '<p:zoom dir="in"/>' },
  circle:    { name: "形状·圆形",  ms: 1000, basic: "<p:circle/>" },
  // —— 动态内容 / 华丽效果（PowerPoint 2010+） ——
  reveal:    { name: "显示",       ms: 1400, basic: "<p:fade/>", ns: "p14", rich: '<p14:reveal thruBlk="1" dir="l"/>' },
  pan:       { name: "平移",       ms: 1000, basic: '<p:push dir="u"/>', ns: "p14", rich: '<p14:pan dir="u"/>' },
  gallery:   { name: "画廊",       ms: 1500, basic: '<p:push dir="l"/>', ns: "p14", rich: '<p14:gallery dir="l"/>' },
  conveyor:  { name: "传送带",     ms: 1400, basic: '<p:push dir="l"/>', ns: "p14", rich: '<p14:conveyor dir="l"/>' },
  ferris:    { name: "摩天轮",     ms: 1500, basic: '<p:push dir="l"/>', ns: "p14", rich: '<p14:ferris dir="l"/>' },
  doors:     { name: "门",         ms: 1400, basic: '<p:split orient="vert" dir="in"/>', ns: "p14", rich: '<p14:doors dir="vert"/>' },
  flip:      { name: "翻转",       ms: 1200, basic: "<p:fade/>", ns: "p14", rich: '<p14:flip dir="r"/>' },
  prism:     { name: "立方体",     ms: 1300, basic: '<p:push dir="l"/>', ns: "p14", rich: '<p14:prism dir="l"/>' },
  // —— 2013 新增效果 ——
  curtains:  { name: "窗帘",       ms: 1800, basic: "<p:fade/>", ns: "p15", rich: '<p15:prstTrans prst="curtains"/>' },
  pageCurl:  { name: "翻书（双页卷曲）", ms: 1500, basic: "<p:fade/>", ns: "p15", rich: '<p15:prstTrans prst="pageCurlDouble"/>' },
  pageCurl1: { name: "页面卷曲（单页）", ms: 1300, basic: "<p:fade/>", ns: "p15", rich: '<p15:prstTrans prst="pageCurlSingle"/>' },
};
/** 不进随机池、但可以在固定方案里用的效果 */
const EXTRA_EFFECTS = {
  vortex: { name: "涡流", ms: 2000, basic: "<p:fade/>", ns: "p14", rich: '<p14:vortex dir="r"/>' },
  random: { name: "随机（原模板用法）", ms: 1500, basic: "<p:random/>" },
};
const ALL_EFFECTS = { ...EFFECTS, ...EXTRA_EFFECTS };
const RANDOM_POOL = Object.keys(EFFECTS); // 20 种

function transitionXml(key) {
  const e = ALL_EFFECTS[key];
  if (!e) throw new Error("未知切换效果: " + key);
  const spd = e.ms >= 1000 ? "slow" : "med";
  const rich = e.rich || e.basic;
  const req = e.ns || "p14"; // p14:dur 需要 p14；新版效果再要求 p14/p15
  const nsDecl = `xmlns:p14="${NS_P14}"` + (req === "p15" ? ` xmlns:p15="${NS_P15}"` : "");
  return (
    `<mc:AlternateContent xmlns:mc="${NS_MC}">` +
      `<mc:Choice ${nsDecl} Requires="${req}"><p:transition spd="${spd}" p14:dur="${e.ms}">${rich}</p:transition></mc:Choice>` +
      `<mc:Fallback><p:transition spd="${spd}">${e.basic}</p:transition></mc:Fallback>` +
    `</mc:AlternateContent>`
  );
}

/** 可复现的随机数（给了 seed 时用） */
function makeRng(seed) {
  if (seed === undefined || seed === null || seed === "") return Math.random;
  let h = crypto.createHash("sha256").update(String(seed)).digest().readUInt32LE(0);
  return () => { // mulberry32
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 随机方案：从 pool 里随机抽 min~max 种，逐页分配，相邻两页不重复
 * @returns {{ chosen: string[], plan: string[], seed: string|undefined }}
 */
function randomPlan(total, { min = 3, max = 5, pool = RANDOM_POOL, seed = process.env.TRANSITION_SEED } = {}) {
  const rng = makeRng(seed);
  const lo = Math.max(2, Math.min(min, pool.length));         // 至少 2 种才能保证相邻不重复
  const hi = Math.max(lo, Math.min(max, pool.length));
  const k = lo + Math.floor(rng() * (hi - lo + 1));
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {             // Fisher–Yates 洗牌
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const chosen = shuffled.slice(0, k);
  const plan = [];
  for (let i = 0; i < total; i++) {
    const options = chosen.filter((e) => e !== plan[i - 1]);  // 排除上一页用过的
    plan.push(options[Math.floor(rng() * options.length)]);
  }
  return { chosen, plan, seed };
}

/** 在终端打印方案，方便核对 */
function describePlan({ chosen, plan, seed }) {
  const names = chosen.map((k) => `${ALL_EFFECTS[k].name}(${k})`).join("、");
  return `[切换] 本次随机抽中 ${chosen.length} 种：${names}` + (seed ? `  种子=${seed}` : "") +
    "\n[切换] 逐页：" + plan.map((k, i) => `${i + 1}.${ALL_EFFECTS[k].name}`).join("  ");
}

/**
 * @param {string} file       .pptx 路径（原地改写）
 * @param {(n:number,total:number)=>string} pick  第 n 页（从 1 开始）用哪个效果
 */
async function addTransitions(file, pick) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  // 按 presentation.xml 里的顺序找出每页对应的 slideN.xml
  const pres = await zip.file("ppt/presentation.xml").async("string");
  const rels = await zip.file("ppt/_rels/presentation.xml.rels").async("string");
  const rIds = [...pres.matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
  const target = (rid) => rels.match(new RegExp(`Id="${rid}"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="${rid}"`)).slice(1).find(Boolean);
  const total = rIds.length;
  for (let i = 0; i < total; i++) {
    const key = pick(i + 1, total);
    if (!key || key === "none") continue;
    const p = "ppt/" + target(rIds[i]).replace(/^\.?\/?/, "");
    let xml = await zip.file(p).async("string");
    xml = xml.replace(/<mc:AlternateContent[^]*?<p:transition[^]*?<\/mc:AlternateContent>|<p:transition[^]*?(<\/p:transition>|\/>)/g, ""); // 去掉旧的
    xml = xml.replace("</p:clrMapOvr>", "</p:clrMapOvr>" + transitionXml(key));
    zip.file(p, xml);
  }
  // 只打包文件、不写文件夹条目（文件夹条目会让部分云盘打不开 pptx）
  const out = new JSZip();
  for (const [name, f] of Object.entries(zip.files)) {
    if (!f.dir) out.file(name, await f.async("uint8array"), { createFolders: false });
  }
  fs.writeFileSync(file, await out.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

module.exports = { addTransitions, randomPlan, describePlan, EFFECTS, ALL_EFFECTS, RANDOM_POOL };
