# 时镜散人 · chronoscop 的洞府

**在线访问：<https://chronoscop.github.io>**

![首屏预览](docs/preview.jpg)

## 洞府一览

- **开场**：一道剑光劈开夜幕，金色阵法逐环成形，道号落笔，朱砂印章盖下。
- **首屏**：水墨山峦、云海、石柱与明月；灵气随鼠标流转，点击可斩出剑气。
- **修士档案**：以 Kaggle 段位对应修仙境界（Expert = 金丹期）。
- **秘境历练**：Kaggle 比赛的奖牌与名次。
- **法宝阁**：精选的 GitHub 项目，以及一座仍在炼制的丹炉。
- **试炼场**：问心局。三道两难，每答一句，执棋人便追问一句；不论对错，只看道心是否前后如一。
- **传音符**：GitHub 与 Kaggle。
- 洞府中藏有彩蛋，线索在页脚。

## 技术要点

页面不加载任何图片文件，画面全部由代码现场生成：

| 画面 | 实现 |
| --- | --- |
| 阵法 | JS 按窗口尺寸生成内联 SVG：二十八宿按传统距度排布，北斗七星按赤经赤纬投影；转动和描边动画交给 CSS |
| 山峦、云海、丹炉、符纸 | JS 拼出的 SVG |
| 石柱峰、崖松 | Canvas 2D，纹理用 value noise / fBm 生成 |
| 星空、灵气粒子、点击剑气、彩蛋 | Canvas 2D |
| 纸纹与噪点 | 内联在 CSS 里的 SVG `feTurbulence` |
| 开场 | CSS 动画，由 main.js 依次给 `<html>` 加上 `go` → `live` → `settled` 三个阶段类来推进 |

- **零外部请求**：不用 CDN、统计脚本或 Google Fonts，favicon 是内联的 data URI。整页传输约 400 KB，其中 HTML、CSS、JS 经 gzip 后共约 45 KB，其余是字体。
- **字体**：四个开源字体自托管，每个只保留页面用到的字（做法见「修改文字与更新字体」）。两种书法字体用 `font-display: block`，避免道号先以系统字体闪现再跳变；正文用 `swap`。
- **性能**：首屏滚出视口或标签页转到后台时，Canvas 动画循环停止、CSS 动画暂停；丹炉只在所在区块可见时燃烧；鼠标视差只在有精确指针的桌面设备上启用。
- **无障碍**：系统开启「减少动态效果」时只渲染一帧静态画面，页内跳转也改为直接定位；系统提示放在 `aria-live` 区域，读屏软件会播报。

## 试炼场：问心局

`assets/js/games.js` 里的问答小游戏。三道两难，每道题的两个选项分别代表「理」（守规矩与公道）和「情」（守人心与恩情）。每答一题，执棋人就追问一句，再在坚持与动摇之间选一次。结局不论对错，只看坚持了几次、三道题的立场是否一致：

| 坚持次数 | 三道题的立场 | 结局 |
| --- | --- | --- |
| 0 / 1 / 2 | 不看 | 道心崩碎 / 道心动摇 / 道心有隙 |
| 3 | 不一致 | 道心如镜 |
| 3 | 一致 | 道心通明，按守的是「理」还是「情」给出不同批语 |

结局下方会列出每一问的回答，并弹出一条系统提示。

实现：

- 独立的经典脚本，不依赖 main.js。main.js 加载了的话，通过它暴露的 `window.dongfuSay` 弹出系统提示。
- 题目渲染在 `aria-live` 区域里，每一步都会把焦点移到第一个选项上，只用键盘也能玩完一局。
- 一局进行中「入局」按钮会隐藏，结束后变成「再入一局」。

修改题目：

- 题目都在 `ROUNDS` 里，格式是 `[题面, [[选项, 立场, 追问, 坚持, 动摇], …]]`，立场只能填「理」或「情」。
- 结局名和批语在 `ENDS`、`CLEAR` 里。它们位于 `kai:start` 和 `kai:end` 两个标记之间，用马善政楷书显示，改完要重新生成字体子集（见「修改文字与更新字体」）。
- 判定是按三道题写死在 `reveal()` 里的。增减题目时要同时改判定，以及 `index.html` 里「三道两难」的介绍。
- 以后加新游戏，代码也写进 games.js：`subset_fonts.py` 只读 index.html、main.js 和 games.js，写在别的 JS 文件里的文字进不了字体子集。

## 目录结构

```text
index.html               页面结构与大部分文案
assets/css/style.css     样式与动效
assets/js/main.js        场景绘制、开场编排、系统提示、彩蛋、丹炉与符纸
assets/js/games.js       试炼场「问心局」，独立于 main.js
assets/fonts/            字体子集（woff2）及其许可证
tools/subset_fonts.py    重新生成字体子集
docs/preview.jpg         README 预览图，页面不加载
.nojekyll                让 GitHub Pages 跳过 Jekyll
```

## 本地预览

直接用浏览器打开 `index.html` 即可，不需要服务器。脚本特意写成经典脚本（不用 ES module，也不用 `fetch`），就是为了能这样打开，改代码时请保持这一点。

想更接近线上环境，也可以起一个静态服务器：

```bash
python -m http.server 8000   # 然后打开 http://localhost:8000
```

要检查「减少动态效果」下的静态版，在 Chrome DevTools 的 Rendering 面板里把 `prefers-reduced-motion` 模拟为 `reduce`，再刷新页面。

## 修改文字与更新字体

文案大多在 `index.html`；问心局的题目与结语在 `assets/js/games.js`，系统提示在 `assets/js/main.js`。

`assets/fonts/` 里的每个字体只保留了页面用到的字。改了上面三个文件里的文字后，新加的字如果显示成系统楷体，就需要重新生成字体子集：

1. 安装依赖：`pip install fonttools brotli`
2. 把完整字体放进 `tools/fonts-src/`（该目录已被 `.gitignore` 忽略，不会提交）：

   | 文件名 | 字体与用途 | 下载 |
   | --- | --- | --- |
   | `ZhiMangXing-Regular.ttf` | 志莽行书：道号、标题、秘境名 | [google/fonts](https://github.com/google/fonts/tree/main/ofl/zhimangxing) |
   | `MaShanZheng-Regular.ttf` | 马善政楷书：诗句、印章 | [google/fonts](https://github.com/google/fonts/tree/main/ofl/mashanzheng) |
   | `LXGWWenKai-Regular.ttf` | 霞鹜文楷：正文 | [LxgwWenKai Releases](https://github.com/lxgw/LxgwWenKai/releases) |
   | `CormorantGaramond-VF.ttf` | Cormorant Garamond：英文与数字 | [google/fonts](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond)（原文件名为 `CormorantGaramond[wght].ttf`） |

3. 运行 `python tools/subset_fonts.py`（字体放在别处时用 `--src <目录>` 指定）。

脚本的做法：

- 用 Python 标准库的 HTMLParser 解析 `index.html`，按元素的 class 决定它用哪种字体。class 与字体的对应写在脚本开头的 `BRUSH`（志莽行书）和 `KAI`（马善政楷书）里，在 `style.css` 里给元素换字体时要同步修改。
- `main.js` 和 `games.js` 去掉注释后的所有字符都并入正文字体，运行时才出现的文字也不会漏；`games.js` 里 `kai:start` 与 `kai:end` 之间的文字另外并入马善政楷书。
- Cormorant Garamond 先从可变字体实例化为 600 字重，只保留 ASCII 和几个符号。
- 输出是确定性的，重复运行不会产生 git 改动。脚本会打印每个字体的字数、体积，以及原字体里本来就没有的字。

改完样式、脚本或字体后，记得更新 `?v=` 版本号（见「部署」）。

页面里的 Kaggle 名次、奖牌等数据截至 2026 年 10 月，需要时直接改 `index.html` 里的数字。ASCII 字符在正文字体和 Cormorant 里是全量保留的，只改数字不用重新生成字体。

## 部署

托管在 GitHub Pages。仓库 **Settings → Pages** 里，Source 选 **Deploy from a branch**，分支 `main`，目录 `/ (root)`。没有构建步骤，仓库里的文件原样上线，所以发布就是推送到 `main`：推送后 Actions 页会跑一次 *pages build and deployment*，通常一分钟左右生效。

- **`.nojekyll`**：空文件，让 Pages 跳过 Jekyll、直接发布原文件。
- **缓存与 `?v=`**：Pages 对所有文件返回 `Cache-Control: max-age=600`，浏览器会把 CSS、JS 和字体缓存 10 分钟。所以改了这些文件后，要把引用处的 `?v=` 统一换成新值（比如当天日期），否则访客可能看到新页面配旧样式。引用处在 `index.html` 加载 CSS、JS 的标签里，以及 `style.css` 的 `@font-face` 里。
- **相对路径**：资源路径都是相对的，发布在子路径下（比如项目仓库的 `https://<用户名>.github.io/<仓库名>/`）或换到别的静态托管都不用改代码。

## 许可

- 代码：[MIT](LICENSE)
- 字体：霞鹜文楷、志莽行书、马善政楷书、Cormorant Garamond 均采用 [SIL Open Font License 1.1](https://openfontlicense.org)，许可证原文见 [`assets/fonts/LICENSES/`](assets/fonts/LICENSES/)
- 页面中的个人资料与文案归作者所有，不在 MIT 授权范围内。
