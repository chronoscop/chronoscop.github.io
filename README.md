# 时镜散人 · chronoscop 的洞府

一个修仙风（网文中二向）的个人主页。纯 HTML / CSS / JavaScript，没有框架，也没有构建步骤，部署在 GitHub Pages。

**在线访问：<https://chronoscop.github.io>**

![首屏预览](docs/preview.jpg)

## 洞府一览

- **开场**：一道剑光劈开夜幕，金色阵法逐环成形，道号落笔，朱砂印章盖下。
- **首屏**：水墨山峦、云海、石柱与明月；灵气随鼠标流转，点击可斩出剑气。
- **修士档案**：以 Kaggle 段位对应修仙境界（Expert = 金丹期）。
- **秘境历练**：Kaggle 比赛的奖牌与名次。
- **法宝阁**：精选的 GitHub 项目，以及一座仍在炼制的丹炉。
- **传音符**：GitHub 与 Kaggle。
- 洞府中藏有彩蛋，线索在页脚。

页面约 430 KB，不请求任何外部资源；会遵从系统的「减少动态效果」设置。

## 本地预览

直接双击 `index.html` 即可，不需要服务器。也可以起一个本地服务器：

```bash
python -m http.server 8000
# 然后打开 http://localhost:8000
```

## 目录结构

```text
index.html               页面结构与全部文字（改文案只需改这里）
assets/css/style.css     样式与动效
assets/js/main.js        阵法、山水、灵气、开场编排、系统提示与彩蛋
assets/fonts/            字体子集（woff2）及其许可证
tools/subset_fonts.py    重新生成字体子集
docs/preview.jpg         README 预览图
```

## 修改文字与更新字体

为了让页面足够轻，`assets/fonts/` 里的每个字体只保留了页面实际用到的字。改了 `index.html` 或 `assets/js/main.js` 里的文字后，新加的字如果显示成系统楷体，就需要重新生成字体子集：

1. 安装依赖：`pip install fonttools brotli`
2. 把完整字体放进 `tools/fonts-src/`（该目录已被 `.gitignore` 忽略，不会提交）：

   | 文件名 | 字体与用途 | 下载 |
   | --- | --- | --- |
   | `ZhiMangXing-Regular.ttf` | 志莽行书：道号、标题、秘境名 | [google/fonts](https://github.com/google/fonts/tree/main/ofl/zhimangxing) |
   | `MaShanZheng-Regular.ttf` | 马善政楷书：诗句、印章 | [google/fonts](https://github.com/google/fonts/tree/main/ofl/mashanzheng) |
   | `LXGWWenKai-Regular.ttf` | 霞鹜文楷：正文 | [LxgwWenKai Releases](https://github.com/lxgw/LxgwWenKai/releases) |
   | `CormorantGaramond-VF.ttf` | Cormorant Garamond：英文与数字 | [google/fonts](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond)（原文件名为 `CormorantGaramond[wght].ttf`） |

3. 运行 `python tools/subset_fonts.py`

脚本会自动从页面里找出每种字体需要渲染的字，重新生成 `assets/fonts/*.woff2`。

改完样式、脚本或字体后，把 `index.html` 和 `assets/css/style.css` 里的 `?v=` 版本号统一换成新的（比如当天日期），浏览器就会重新下载，不会出现新页面配旧样式的情况。

页面里的 Kaggle 名次、奖牌等数据截至 2026 年 10 月，需要时直接改 `index.html` 里的数字。

## 许可

- 代码：[MIT](LICENSE)
- 字体：霞鹜文楷、志莽行书、马善政楷书、Cormorant Garamond 均采用 [SIL Open Font License 1.1](https://openfontlicense.org)，许可证原文见 [`assets/fonts/LICENSES/`](assets/fonts/LICENSES/)
- 页面中的个人资料与文案归作者所有，不在 MIT 授权范围内。
