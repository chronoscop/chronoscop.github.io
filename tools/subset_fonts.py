"""Regenerate the font subsets in assets/fonts from the full font files.

Each web font only carries the characters the page renders with it, which keeps the site
light. Run this after changing any text in index.html or assets/js/main.js:

    pip install fonttools brotli
    python tools/subset_fonts.py              # full fonts in tools/fonts-src/
    python tools/subset_fonts.py --src DIR    # or in another folder

Full fonts (all SIL OFL 1.1), saved under these names:
    ZhiMangXing-Regular.ttf    https://github.com/google/fonts/tree/main/ofl/zhimangxing
    MaShanZheng-Regular.ttf    https://github.com/google/fonts/tree/main/ofl/mashanzheng
    LXGWWenKai-Regular.ttf     https://github.com/lxgw/LxgwWenKai/releases
    CormorantGaramond-VF.ttf   https://github.com/google/fonts/tree/main/ofl/cormorantgaramond
                               (the file there is named CormorantGaramond[wght].ttf)
"""
import argparse
import pathlib
import re
import sys
from html.parser import HTMLParser

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"

# Which elements are set in which display face. Keep in sync with assets/css/style.css.
BRUSH = {"daohao", "zh", "panel-name", "realm-badge", "medal", "trial-medal", "trial-name",
         "tr-name", "sys-line-tag", "fu-k"}                       # 志莽行书
KAI = {"motto-text", "bn-verse", "forge-verse", "seal-in"}         # 马善政楷书
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "source", "track", "wbr"}
CJK_PUNCT = "，。、；：？！“”‘’（）《》「」【】—…·"


class Collector(HTMLParser):
    """Collects every rendered character, plus the ones inside BRUSH / KAI elements."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.body, self.brush, self.kai = set(), set(), set()

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        classes = set((dict(attrs).get("class") or "").split())
        self.stack.append((tag, classes))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break

    def handle_data(self, data):
        if any(t in ("script", "style", "title") for t, _ in self.stack):
            return
        chars = set(data) - set(" \t\r\n")
        self.body |= chars
        if any(c & BRUSH for _, c in self.stack):
            self.brush |= chars
        if any(c & KAI for _, c in self.stack):
            self.kai |= chars


def strip_js_comments(src):
    src = re.sub(r"/\*.*?\*/", "", src, flags=re.S)
    return re.sub(r"(?m)^\s*//.*$|(?<=[;{}),])\s*//[^\n]*$", "", src)


def make_subset(font, chars, out, features):
    cmap = font.getBestCmap()
    have = sorted(c for c in chars if ord(c) in cmap)
    opts = subset.Options()
    opts.flavor = "woff2"
    opts.layout_features = features
    opts.hinting = False
    opts.name_IDs = ["*"]
    opts.name_languages = ["*"]
    sub = subset.Subsetter(options=opts)
    sub.populate(unicodes=[ord(c) for c in have])
    sub.subset(font)
    font.save(out)
    missing = "".join(sorted(c for c in chars if ord(c) not in cmap and ord(c) > 0x7F))
    note = f"  (not in this font: {missing})" if missing else ""
    print(f"{out.name:20s} {len(have):4d} chars  {out.stat().st_size / 1024:6.1f} KB{note}")


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--src", default=str(ROOT / "tools" / "fonts-src"), help="folder with the full fonts")
    src = pathlib.Path(ap.parse_args().src)

    page = Collector()
    page.feed((ROOT / "index.html").read_text(encoding="utf-8"))
    js = strip_js_comments((ROOT / "assets" / "js" / "main.js").read_text(encoding="utf-8"))
    toast_tags = set("".join(re.findall(r"say\('([^']+)'", js)))     # system-toast labels use the brush face
    ascii_ = {chr(c) for c in range(0x20, 0x7F)}

    body = page.body | set(js) | set(CJK_PUNCT) | ascii_
    body = {c for c in body if c.isprintable()}
    brush = (page.brush | toast_tags) - ascii_
    kai = page.kai - ascii_

    OUT.mkdir(parents=True, exist_ok=True)
    cjk_features = ["vert", "vrt2", "kern"]
    make_subset(TTFont(src / "ZhiMangXing-Regular.ttf"), brush, OUT / "zhimangxing.woff2", cjk_features)
    make_subset(TTFont(src / "MaShanZheng-Regular.ttf"), kai, OUT / "mashanzheng.woff2", cjk_features)
    make_subset(TTFont(src / "LXGWWenKai-Regular.ttf"), body, OUT / "lxgwwenkai.woff2", cjk_features)
    cormorant = instancer.instantiateVariableFont(TTFont(src / "CormorantGaramond-VF.ttf"), {"wght": 600})
    make_subset(cormorant, ascii_ | set("–—·×→"), OUT / "cormorant.woff2", ["kern", "liga", "lnum", "tnum"])


if __name__ == "__main__":
    main()
