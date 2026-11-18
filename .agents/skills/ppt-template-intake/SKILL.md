---
name: "ppt-template-intake"
description: "开发者把一个 .pptx 模板做成模板库里的标准模板时使用：分析模板、写 meta.json 和按页面类型分函数的 build.js、补齐缺少的页面类型、跑入库自测并逐页看图修到通过。用户说\"模板入库\"、\"把这个模板做进库\"、\"新增一个 PPT 模板\"时使用。"
---

# 模板入库（.pptx → 标准模板）

把一个 .pptx 模板做成 `templates/<id>/`（原模板里的渐变矢量装饰可用 `tools/pptx_extract.py` 抠成透明 PNG，`templates/tech-hud/build.js` 是用法范例），通过自测后直接放进模板库，「PPT 生成」skill 会自动用上。
**先读模板库的 `TEMPLATE_SPEC.md`**（页面类型、字数上限、ctx API、硬性要求），再把 `templates/morimoto/build.js` 当完整范例看一遍。

> **在其他 AI 工具里用**：文中的 `AskUserQuestion`（选择题）、`SendUserFile`（发文件）、`device_*`（操作用户电脑）是 Claude 的工具名。你的工具里没有的话就用等价做法：选择题直接在对话里列出 A / B / C 让用户回复；发文件就告诉用户文件的完整路径（预览图能显示就直接显示）；在用户电脑上运行的工具直接在项目根目录执行命令。

## 第 0 步：准备

1. 拿到模板库：就是本 skill 所在的项目文件夹（在它里面打开的 Codex / Claude Code 直接在根目录运行）；否则同「PPT 生成」skill 第 0 步（连接文件夹 → device_bash 或 stage；或上传的 zip）。没有 `node_modules/` 就先 `npm install`。
2. 拿到用户的 .pptx 模板。开工前一次问清（AskUserQuestion，已说过的跳过）：
   - 模板叫什么、id 用什么（小写英文，如 `tech-blue`）
   - 风格标签和适合的主题（不知道就看完模板后给建议让用户确认）
   - 是否要分享 / 收费（决定要不要马上把原图全部换成 AI 图）

## 第 1 步：分析模板

```bash
mkdir -p work/src && cd work/src && unzip -q -o ../../template.pptx      # 解压到新的空目录
```
- 渲染成图：soffice 转 PDF → `pdftoppm -jpeg -r 50` → 逐页看（可用 `core/preview.js` 的 `grid` 拼总览）。
- 读 `ppt/theme/theme1.xml` 取配色和字体；读各 `ppt/slides/slideN.xml` 取关键元素坐标（EMU ÷ 914400 = 英寸）和字号（sz ÷ 100 = pt）。
- 把 `ppt/media/*` 拷到 `templates/<id>/assets/`。
- 把原模板每一页对应到页面类型，列一张表（写在工作笔记里）：

| 页面类型 | 借用原模板第几页 | 版式名 | 备注 |
|---|---|---|---|
| cover | p1 | hero | … |
| points4 | p6、p9 | cards、grid | 两个候选版式 |
| quote | （无） | — | 需要新设计 |

每个**必需类型**（cover toc section points3 points4 compare stats timeline imageText quote closing）至少 1 个版式；原模板没有的，**按模板的视觉语言自己设计**（同样的配色、字体、装饰元素、留白节奏）。常用类型（points3/points4/imageText/compare/stats）争取 2 个版式。可选类型（table/steps）原模板有就做。

## 第 2 步：写 meta.json

字段按 TEMPLATE_SPEC 第 3 节。注意：
- `tone` 要准（深色 / 浅色 / 彩色），3 选 1 靠它拉开差异。
- `layouts` 必须和 build.js 里实际实现的版式名完全一致。
- `imageStyle` 写和模板配色、气质一致的画风描述（结尾写「画面中不要出现任何文字、Logo 或水印」），AI 配图才会和模板统一。
- `description` ≤ 40 字，写给最终用户看。

## 第 3 步：写 build.js

结构照 morimoto：设计令牌（颜色、字体）→ 排版组件（text / head / eyebrow / rect / 叶影类装饰）→ 每种页面类型一个函数 → `render(deck, ctx)` 里 `ctx.renderAll({...})`。

硬性要求（自测会查）：
1. **装得下上限**：字数拉满不溢出。标题、标签用 `ctx.fit` / `ctx.fitLine` 自动缩字，纵向堆叠用 `ctx.measure` 算高度，窄框正文自动走 `ctx.balance`（只在单字掉行时生效）。正文 ≥ 11pt。
2. **最少时不空洞**：列表条数少、可选字段为空时，整组元素不画或版式自适应（按条数算列数 / 间距）。
3. **所有非空文字槽位都要显示**；文字不能画进图片里；不写死示例文案。
4. `ctx.addSlide(s, { master, bg })` 必须传 bg（背景色，或 `"image"`），否则对比度检查不了。
5. 图片一律 `ctx.pic(slide, s, idx, …, { fallback: "原图.jpg" })`（引擎处理 AI / 网图 / 原图兜底）；装饰素材用 `ctx.prep`，objectName 带「装饰」；不需要动画的带「static」。
6. 一个类型有多个版式时用 `ctx.pickLayout(s, 候选)`，候选可以按内容过滤（如数值才给 chart、有图才给图片版式）。
7. 浅色底不放白字；文字离左右边缘 ≥ 0.3"。

## 第 4 步：自测 + 看图（循环到通过）

```bash
node core/selftest.js <id>
```
- 有错误：看 `projects/_selftest_<id>/{sample,max,min}/*.report.json` → `issues`，改 build.js 再跑。
- **必须自己看图**（质检只是估算）：`projects/_selftest_<id>/max/max_preview/overview.jpg`、`min/min_preview/overview.jpg`、`templates/<id>/preview/overview.jpg`，可疑页用 Read 放大。检查清单：
  - max 版有没有拥挤、重叠、缩得太小的字、被图片压住的标签？
  - min 版有没有大片空白、空卡片壳？
  - 和原模板风格是否一致（配色、字体、装饰、留白）？新设计的页面类型融不融得进去？
  - 图片裁切是否合理（人脸 / 主体没被裁掉）？
- 通过标准：meta 无错误；3 套 deck 质检无错误；validate.py PASSED；看图无明显问题。提示项可以保留，但要逐条确认可接受。
- `samplePages` 选的两页不够有代表性时，改 `meta.preview.samplePages` 再跑一次（影响预览卡片）。

## 第 5 步：交付

- 连接了模板库文件夹：模板已在 `templates/<id>/`（stage 方式工作时用 `device_commit_files` 写回 `build.js`、`meta.json`、`assets/*`、`preview/*`）。
- 否则把 `templates/<id>/` 打包成 zip 发给用户，告诉他解压到模板库的 `templates/` 下。
- 生成一组预览卡片给用户确认：`node core/card.js --ids <id> --title "示例标题"`。
- 回复：页面类型 / 版式数量、哪些是新设计的、自测结果（错误 / 提示数）、版权提醒（原图是否为网络素材）。
- 不改 `core/` 引擎和其他模板。发现标准本身需要调整（如某个字数上限明显不合理），告诉用户并说明理由，商量后再改 TEMPLATE_SPEC + core/spec.js。