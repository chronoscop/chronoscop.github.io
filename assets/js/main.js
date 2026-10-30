/* 时镜散人 · 洞府 — main.js
 * 画阵法、山、石柱、松、云海与灵气，跑开场编排、系统提示、剑气与彩蛋，并绘制丹炉与符纸。
 * 页面上的文字都写在 index.html 里。这是经典脚本（不用 module、不用 fetch），双击本地打开也能用。
 */
(function () {
  'use strict';

  var doc = document.documentElement;
  var hero = document.querySelector('.hero');
  if (!hero) return;

  function mq(q) { try { return window.matchMedia(q).matches; } catch (e) { return false; } }
  var ANIM = doc.classList.contains('anim');
  var FINE = mq('(hover: hover) and (pointer: fine)');
  var TAU = Math.PI * 2;

  if (window.CSS && CSS.registerProperty) {
    try { CSS.registerProperty({ name: '--sw', syntax: '<angle>', inherits: false, initialValue: '-16deg' }); } catch (e) { /* already registered by @property */ }
  } else {
    doc.classList.add('no-prop');
  }

  /* ───────────── geometry ───────────── */

  var G = { w: 0, h: 0, R: 0, cx: 0, cy: 0, portrait: false };

  function measure() {
    var w = hero.clientWidth, h = hero.clientHeight;
    var portrait = mq('(max-aspect-ratio: 4/5)');
    var R = portrait ? Math.min(w * 0.6, h * 0.31) : Math.min(h * 0.43, w * 0.36, 470);
    G.w = w; G.h = h; G.portrait = portrait;
    G.R = Math.round(R);
    G.cx = w / 2;
    G.cy = h * (portrait ? 0.385 : 0.475);
    hero.style.setProperty('--R', G.R + 'px');
  }

  /* ───────────── small helpers ───────────── */

  function r2(v) { return Math.round(v * 100) / 100; }
  function rad(a) { return (a - 90) * Math.PI / 180; }              // a: degrees clockwise from 12 o'clock
  function px(r, a) { return r2(r * Math.cos(rad(a))); }
  function py(r, a) { return r2(r * Math.sin(rad(a))); }
  function pt(r, a) { return px(r, a) + ',' + py(r, a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // 0…1 value noise and its fbm (used by the pillars and the pine)
  function noise01(seed) {
    var r = mulberry32(seed), v = new Float32Array(256);
    for (var i = 0; i < 256; i++) v[i] = r();
    return function (x) {
      var i0 = Math.floor(x), f = x - i0, t = f * f * (3 - 2 * f);
      return v[i0 & 255] * (1 - t) + v[(i0 + 1) & 255] * t;
    };
  }
  function fbm01(n, x, oct) {
    oct = oct || 4;
    var s = 0, a = 0.5, f = 1, norm = 0;
    for (var i = 0; i < oct; i++) { s += a * n(x * f + i * 17.3); norm += a; a *= 0.5; f *= 2.03; }
    return s / norm;
  }

  function fitCanvas(canvas, w, h, scale) {
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    var c = canvas.getContext('2d');
    c.setTransform(scale, 0, 0, scale, 0, 0);
    c.clearRect(0, 0, w, h);
    return c;
  }

  function circ(r, sw, op, more) {
    return '<circle class="a-ln' + (more && more.cls ? ' ' + more.cls : '') + '" r="' + r2(r) + '" stroke-width="' + sw +
      '" stroke-opacity="' + op + '"' + (more && more.attr ? ' ' + more.attr : '') + '/>';
  }
  function radial(r1, r0, a, sw, op, cls) {
    return '<path class="a-ln' + (cls ? ' ' + cls : '') + '" d="M' + pt(r1, a) + 'L' + pt(r0, a) + '" stroke-width="' + sw + '" stroke-opacity="' + op + '"/>';
  }
  function diamond(r, a, w, h, op, cls, style) {
    // a small rhombus centred on (r, a), long axis radial
    var t = rad(a), cx = r * Math.cos(t), cy = r * Math.sin(t);
    var tx = -Math.sin(t) * w, ty = Math.cos(t) * w;
    var d = 'M' + pt(r + h, a) + 'L' + r2(cx + tx) + ',' + r2(cy + ty) + 'L' + pt(r - h, a) + 'L' + r2(cx - tx) + ',' + r2(cy - ty) + 'Z';
    return '<path class="a-hi' + (cls ? ' ' + cls : '') + '" d="' + d + '" fill-opacity="' + op + '"' + (style ? ' style="' + style + '"' : '') + '/>';
  }
  function glyph(ch, r, a, size, op) {
    return '<text class="a-tx" font-size="' + r2(size) + '" fill-opacity="' + op + '" transform="rotate(' + r2(a) + ') translate(0 ' + r2(-r) + ')">' + ch + '</text>';
  }
  function svgWrap(R, inner) {
    return '<svg viewBox="' + (-R) + ' ' + (-R) + ' ' + (2 * R) + ' ' + (2 * R) + '" focusable="false">' + inner + '</svg>';
  }

  /* ───────────── the formation ───────────── */

  // 二十八宿 with their traditional 距度 (degrees of a 365¼° circle), from 角 eastward
  var XIU = '角亢氐房心尾箕斗牛女虚危室壁奎娄胃昴毕觜参井鬼柳星张翼轸';
  var XIU_DEG = [12, 9, 15, 5, 5, 18, 11, 26.25, 8, 12, 10, 17, 16, 9, 16, 12, 14, 11, 16, 2, 9, 33, 4, 15, 7, 18, 18, 17];
  var ZHI = '子丑寅卯辰巳午未申酉戌亥';
  // 先天八卦 clockwise from the top (south up): 乾 巽 坎 艮 坤 震 离 兑 — lines bottom → top, 1 = yang
  var GUA = [[1, 1, 1], [0, 1, 1], [0, 1, 0], [0, 0, 1], [0, 0, 0], [1, 0, 0], [1, 0, 1], [1, 1, 0]];
  // 北斗七星 (RA hours, Dec°): 天枢 天璇 天玑 天权 玉衡 开阳 摇光
  var DIPPER = [[11.062, 61.75], [11.031, 56.38], [11.897, 53.69], [12.257, 57.03], [12.9, 55.96], [13.399, 54.93], [13.792, 49.31]];

  function ringFrame(R) {
    var o = '';
    o += circ(R * 0.992, 0.9, 0.55, { cls: 'draw', attr: 'pathLength="1" transform="rotate(-90)" style="--d:.05s;--t:1.3s"' });
    o += circ(R * 0.972, 1.3, 0.55, { cls: 'fade', attr: 'stroke-linecap="round" stroke-dasharray="0.01 ' + r2(Math.max(4.5, R * 0.0145)) + '" style="--d:.5s"' });
    for (var k = 0; k < 8; k++) {
      var a = k * 45;
      if (k % 2 === 0) o += diamond(R * 0.992, a, Math.max(2.4, R * 0.0075), Math.max(5, R * 0.016), 0.9, 'pop', '--d:' + (0.8 + k * 0.05).toFixed(2) + 's');
      else o += radial(R * 1.0, R * 0.962, a, 0.8, 0.45, 'fade');
    }
    // the still centre
    o += circ(R * 0.19, 0.7, 0.32, { cls: 'fade', attr: 'stroke-dasharray="2 5" style="--d:1s"' });
    o += circ(R * 0.125, 0.6, 0.22, { cls: 'fade', attr: 'style="--d:1.1s"' });
    return o;
  }

  function ringTicks(R) {
    var rO = R * 0.948, rI = R * 0.896, o = '';
    o += circ(rO, 0.9, 0.6) + circ(rI, 0.7, 0.42);
    var small = R < 320;
    var minorStep = small ? 2 : 1;
    var lenMinor = Math.max(4, R * 0.016), lenMid = Math.max(7, R * 0.03), lenMajor = Math.max(11, R * 0.05);
    function ticks(len, every, widthPx, op) {
      var rr = rO - len / 2;
      var w = widthPx * 360 / (2 * Math.PI * rr);                      // dash width in degrees
      return '<circle class="a-ln" r="' + r2(rr) + '" stroke-width="' + r2(len) + '" stroke-opacity="' + op +
        '" pathLength="360" stroke-dasharray="' + r2(w) + ' ' + r2(every - w) + '" stroke-dashoffset="' + r2(w / 2) + '"/>';
    }
    o += ticks(lenMinor, minorStep, 0.8, 0.55);
    o += ticks(lenMid, 5, 1, 0.7);
    o += ticks(lenMajor, 30, 1.4, 0.85);
    for (var k = 0; k < 12; k++) {
      var a = k * 30 + 15;
      o += '<circle class="a-hi" cx="' + px(rI + R * 0.014, a) + '" cy="' + py(rI + R * 0.014, a) + '" r="' + r2(Math.max(1, R * 0.0028)) + '" fill-opacity=".7"/>';
    }
    return svgWrap(R, o);
  }

  function ringXiu(R) {
    var rO = R * 0.876, rI = R * 0.8, rT = R * 0.838, fs = Math.max(9, R * 0.035), o = '';
    o += circ(rO, 0.8, 0.55) + circ(rI, 0.7, 0.42);
    var scale = 360 / 365.25, acc = 0, start = 270;  // 角 at the east (left), running counter-clockwise
    for (var k = 0; k < 28; k++) {
      var w = XIU_DEG[k] * scale;
      var a0 = start - acc;
      o += radial(rO - 1, rI + 1, a0, 0.7, 0.38);
      o += glyph(XIU[k], rT, a0 - w / 2, fs, 0.82);
      acc += w;
    }
    return svgWrap(R, o);
  }

  function ringGua(R) {
    var rO = R * 0.776, rI = R * 0.644, rc = R * 0.71, o = '';
    o += circ(rO, 0.8, 0.55) + circ(rI, 0.8, 0.5) + circ(R * 0.758, 0.5, 0.22) + circ(R * 0.662, 0.5, 0.22);
    var L = Math.max(22, R * 0.112), t = Math.max(2, R * 0.0105), g = Math.max(2.6, R * 0.0135), gap = Math.max(4, R * 0.026);
    var rx = r2(t * 0.3);
    for (var k = 0; k < 8; k++) {
      var bars = '';
      for (var j = 0; j < 3; j++) {
        var y = r2(-(rc + (j - 1) * (t + g)) - t / 2);
        if (GUA[k][j]) bars += '<rect x="' + r2(-L / 2) + '" y="' + y + '" width="' + r2(L) + '" height="' + r2(t) + '" rx="' + rx + '"/>';
        else bars += '<rect x="' + r2(-L / 2) + '" y="' + y + '" width="' + r2(L / 2 - gap / 2) + '" height="' + r2(t) + '" rx="' + rx + '"/>' +
          '<rect x="' + r2(gap / 2) + '" y="' + y + '" width="' + r2(L / 2 - gap / 2) + '" height="' + r2(t) + '" rx="' + rx + '"/>';
      }
      o += '<g class="a-hi" fill-opacity=".86" transform="rotate(' + (k * 45) + ')">' + bars + '</g>';
      var b = k * 45 + 22.5;
      o += radial(R * 0.752, R * 0.668, b, 0.6, 0.3);
      o += '<circle class="a-hi" cx="' + px(rc, b) + '" cy="' + py(rc, b) + '" r="' + r2(Math.max(1.1, R * 0.0032)) + '" fill-opacity=".8"/>';
    }
    return svgWrap(R, o);
  }

  function ringZhi(R) {
    var rO = R * 0.624, rI = R * 0.56, rT = R * 0.592, fs = Math.max(8.5, R * 0.031), o = '';
    o += circ(rO, 0.7, 0.5) + circ(rI, 0.7, 0.42);
    for (var k = 0; k < 12; k++) {
      var a = 180 + k * 30;                         // 子 at the north (bottom), clockwise
      o += glyph(ZHI[k], rT, a, fs, 0.78);
      o += diamond(rT, a + 15, Math.max(1.3, R * 0.0035), Math.max(2.4, R * 0.0068), 0.7);
    }
    return svgWrap(R, o);
  }

  function ringStars(R) {
    var rS = R * 0.536, o = '';
    o += '<defs><radialGradient id="zf-glow"><stop offset="0" stop-color="#f2dfae" stop-opacity=".75"/><stop offset=".35" stop-color="#d9b56c" stop-opacity=".22"/><stop offset="1" stop-color="#d9b56c" stop-opacity="0"/></radialGradient></defs>';
    o += circ(rS, 0.8, 0.5, { cls: 'draw', attr: 'pathLength="1" transform="rotate(-90)" style="--d:.55s;--t:1s"' });
    // the {8/3} star, traced as one continuous stroke
    var d = '', k = 0;
    for (var i = 0; i <= 8; i++) { d += (i ? 'L' : 'M') + pt(rS, (k % 8) * 45); k += 3; }
    o += '<path class="a-ln draw" d="' + d + '" stroke-width=".75" stroke-opacity=".4" stroke-linejoin="round" pathLength="1" style="--d:.62s;--t:1.2s"/>';
    o += circ(R * 0.42, 0.6, 0.28, { cls: 'fade', attr: 'stroke-dasharray="1.5 4" style="--d:.8s"' });
    o += circ(R * 0.3, 0.6, 0.3, { cls: 'fade', attr: 'style="--d:.9s"' });
    for (i = 0; i < 8; i++) {
      var a = i * 45;
      o += '<circle class="a-ln pop" cx="' + px(rS, a) + '" cy="' + py(rS, a) + '" r="' + r2(Math.max(2.2, R * 0.0075)) + '" stroke-width=".8" stroke-opacity=".75" style="--d:' + (1 + i * 0.04).toFixed(2) + 's"/>';
      o += radial(R * 0.42, R * 0.3, a + 22.5, 0.6, 0.28, 'fade d9');
    }
    // scattered faint stars of the chart
    var rnd = mulberry32(28);
    for (i = 0; i < 22; i++) {
      var rr = R * (0.22 + rnd() * 0.3), aa = rnd() * 360;
      if (aa > 268 && aa < 332 && rr > R * 0.3) continue;      // keep the dipper clear
      o += '<circle class="a-hi fade" cx="' + px(rr, aa) + '" cy="' + py(rr, aa) + '" r="' + r2(0.6 + rnd() * 0.7) + '" fill-opacity="' + r2(0.25 + rnd() * 0.35) + '" style="--d:1.2s"/>';
    }
    // 北斗: polar projection around the pole (the array's centre); the pointer stars aim at the pole
    var kk = R * 0.0128, off = 114, P = [];
    for (i = 0; i < DIPPER.length; i++) {
      var s = DIPPER[i];
      P.push([(90 - s[1]) * kk, s[0] * 15 + off]);
    }
    function sp(n) { return pt(P[n][0], P[n][1]); }
    o += '<path class="a-ln draw" d="M' + sp(0) + 'L' + sp(1) + 'L' + sp(2) + 'L' + sp(3) + 'Z" stroke-width=".8" stroke-opacity=".55" stroke-linejoin="round" pathLength="1" style="--d:1.3s;--t:.7s"/>';
    o += '<path class="a-ln draw" d="M' + sp(3) + 'L' + sp(4) + 'L' + sp(5) + 'L' + sp(6) + '" stroke-width=".8" stroke-opacity=".55" stroke-linejoin="round" pathLength="1" style="--d:1.45s;--t:.6s"/>';
    // pointer line (天璇 → 天枢 → the pole), dashed
    var pa = P[0][1] + (P[0][1] - P[1][1]) * 0.6;
    o += '<path class="a-ln fade" d="M' + sp(0) + 'L' + pt(R * 0.205, pa) + '" stroke-width=".7" stroke-opacity=".38" stroke-dasharray="2 4" style="--d:1.7s"/>';
    for (i = 0; i < P.length; i++) {
      var sx = px(P[i][0], P[i][1]), sy = py(P[i][0], P[i][1]);
      var big = i === 0 || i === 1 || i === 4 ? 1.15 : 1;
      o += '<g class="pop" style="--d:' + (1.1 + i * 0.06).toFixed(2) + 's"><circle cx="' + sx + '" cy="' + sy + '" r="' + r2(Math.max(5, R * 0.017) * big) + '" fill="url(#zf-glow)"/>' +
        '<circle cx="' + sx + '" cy="' + sy + '" r="' + r2(Math.max(1.3, R * 0.0042) * big) + '" fill="#fff4dc"/></g>';
    }
    return svgWrap(R, o);
  }

  var rings = {
    r0: hero.querySelector('.r0'),
    r1: hero.querySelector('.r1 .spin'),
    r2: hero.querySelector('.r2 .spin'),
    r3: hero.querySelector('.r3 .spin'),
    r4: hero.querySelector('.r4 .spin'),
    r5: hero.querySelector('.r5 .spin')
  };

  function buildArray() {
    var R = G.R;
    rings.r0.innerHTML = svgWrap(R, ringFrame(R));
    rings.r1.innerHTML = ringTicks(R);
    rings.r2.innerHTML = ringXiu(R);
    rings.r3.innerHTML = ringGua(R);
    rings.r4.innerHTML = ringZhi(R);
    rings.r5.innerHTML = ringStars(R);
  }

  /* ───────────── ink ridges ───────────── */

  // peaks: [centre x (×W), half-width (×W), height (×H), skew (-1…1, steeper on one side)]
  // ink = colour at the ridge, mist = colour where the layer sinks into haze,
  // edge = [colour, opacity, width, blur] of the ink pooled under the ridge line, blur = softening of far layers
  var RIDGES = {
    land: [
      { base: 0.72, amp: 0.016, seed: 3, ink: '#1f2945', mist: '#29345a', blur: 1.3, edge: ['#171f37', 0.4, 22, 7],
        peaks: [[0.075, 0.05, 0.225, 0.3], [0.115, 0.025, 0.16, 0], [0.875, 0.05, 0.17, -0.25], [0.91, 0.025, 0.125, 0], [0.62, 0.07, 0.075, 0.2], [0.33, 0.07, 0.06, -0.2], [0.975, 0.03, 0.1, 0]] },
      { base: 0.78, amp: 0.014, seed: 8, ink: '#19223d', mist: '#222c4b', blur: 0.6, edge: ['#10172d', 0.42, 24, 8],
        peaks: [[0.2, 0.055, 0.18, -0.3], [0.03, 0.045, 0.13, 0.2], [0.78, 0.055, 0.115, 0.3], [0.815, 0.025, 0.085, 0], [0.5, 0.12, 0.035, 0]] },
      { base: 0.87, amp: 0.012, seed: 13, ink: '#121a2e', mist: '#18213a', blur: 0, edge: ['#0a101d', 0.45, 26, 9],
        peaks: [[0.0, 0.085, 0.36, 0.2], [0.07, 0.03, 0.27, 0], [0.285, 0.05, 0.13, -0.3], [0.955, 0.07, 0.23, -0.2], [0.7, 0.045, 0.11, 0.1]] },
      { base: 0.965, amp: 0.009, seed: 21, ink: '#0c1221', mist: '#0e1425', blur: 0, edge: ['#070b14', 0.45, 26, 10],
        peaks: [[-0.035, 0.08, 0.47, 0.2], [0.02, 0.03, 0.35, 0], [1.04, 0.08, 0.31, -0.2], [0.58, 0.08, 0.03, 0]] },
      { base: 0.995, amp: 0.006, seed: 34, ink: '#090d18', mist: '#0a0e1a', blur: 0, edge: null,
        peaks: [[0.86, 0.07, 0.11, 0.3], [0.14, 0.12, 0.06, 0]] }
    ],
    port: [
      { base: 0.66, amp: 0.012, seed: 5, ink: '#1f2945', mist: '#29345a', blur: 1, edge: ['#171f37', 0.4, 16, 5],
        peaks: [[0.83, 0.11, 0.16, -0.2], [0.87, 0.045, 0.11, 0], [0.13, 0.14, 0.085, 0.2], [0.47, 0.1, 0.025, 0]] },
      { base: 0.745, amp: 0.012, seed: 9, ink: '#19223d', mist: '#222c4b', blur: 0.5, edge: ['#10172d', 0.42, 18, 6],
        peaks: [[0.04, 0.12, 0.17, 0.25], [0.11, 0.045, 0.11, 0], [0.99, 0.085, 0.11, 0], [0.62, 0.1, 0.025, 0], [0.36, 0.08, 0.018, 0]] },
      { base: 0.83, amp: 0.012, seed: 14, ink: '#121a2e', mist: '#18213a', blur: 0, edge: ['#0a101d', 0.45, 20, 7],
        peaks: [[1.0, 0.14, 0.24, -0.2], [0.92, 0.045, 0.15, 0], [0.3, 0.1, 0.06, 0]] },
      { base: 0.9, amp: 0.01, seed: 22, ink: '#0c1221', mist: '#0e1425', blur: 0, edge: ['#070b14', 0.45, 20, 8],
        peaks: [[-0.05, 0.19, 0.35, 0.25], [0.05, 0.05, 0.24, 0], [0.7, 0.12, 0.04, 0]] },
      { base: 0.978, amp: 0.006, seed: 35, ink: '#090d18', mist: '#0a0e1a', blur: 0, edge: null,
        peaks: [[1.02, 0.17, 0.13, -0.2]] }
    ]
  };
  var ridgeHosts = [1, 2, 3, 4, 5].map(function (i) { return hero.querySelector('.ridge-' + i); });
  var RIDGE_PAD = 40;
  var ridgeXY = [], ridgeTop = [];

  function valueNoise(seed) {
    var rnd = mulberry32(seed), N = 512, tab = [];
    for (var i = 0; i < N; i++) tab.push(rnd() * 2 - 1);
    return function (x) {
      var i0 = Math.floor(x), f = x - i0, u = f * f * (3 - 2 * f);
      var a = tab[((i0 % N) + N) % N], b = tab[(((i0 + 1) % N) + N) % N];
      return a + (b - a) * u;
    };
  }
  function fbm(n, x, oct) {
    var s = 0, amp = 1, norm = 0;
    for (var o = 0; o < oct; o++) { s += amp * n(x); norm += amp; amp *= 0.5; x = x * 2.03 + 17.1; }
    return s / norm;
  }
  function smax(a, b, k) { return (a + b + Math.sqrt((a - b) * (a - b) + k * k)) / 2; }

  function peakShape(u) {
    var s = 1 / Math.cosh(u);
    return 0.7 * Math.exp(-1.3 * u * u) + 0.3 * Math.pow(s, 1.5);   // rounded summit, steep flanks, long foothills
  }

  function buildRidges() {
    var set = G.portrait ? RIDGES.port : RIDGES.land;
    var W = G.w, H = G.h, pad = RIDGE_PAD, step = Math.max(3, Math.round(W / 300));
    for (var li = 0; li < 5; li++) {
      var L = set[li], n = valueNoise(L.seed), pts = [], xy = [], top = H;
      var maxLift = 0;
      for (var q = 0; q < L.peaks.length; q++) maxLift = Math.max(maxLift, L.peaks[q][2]);
      maxLift *= H;
      for (var x = -pad; x <= W + pad + step; x += step) {
        var lift = 0;
        for (var k = 0; k < L.peaks.length; k++) {
          var p = L.peaks[k], sk = p[3] || 0;
          var u = (x - p[0] * W) / (p[1] * W);
          u *= u < 0 ? 1 + sk : 1 - sk;
          lift = smax(lift, p[2] * H * peakShape(u), H * 0.01);
        }
        var rel = lift / (maxLift || 1);
        var nx = x / Math.max(W, 700);
        var broad = fbm(n, nx * 6, 3);
        var fine = fbm(n, nx * 46 + 40, 2);
        var crag = 1 - Math.abs(fbm(n, nx * 17 + 90, 2));
        var nz = broad * 0.6 + fine * 0.28 * (0.45 + rel) + (crag - 0.55) * 0.7 * rel;
        var y = L.base * H - lift - nz * L.amp * H * (0.8 + rel);
        pts.push(r2(x) + ',' + r2(y));
        xy.push([x, y]);
        if (y < top) top = y;
      }
      top = Math.floor(top - 10);
      ridgeXY[li] = xy;
      ridgeTop[li] = top;
      var hgt = H - top;
      var id = 'rg' + li;
      var ridgeLine = 'M' + pts.join('L');
      var body = ridgeLine + 'L' + (W + pad + step) + ',' + (H + 2) + 'L' + (-pad) + ',' + (H + 2) + 'Z';
      var defs = '<linearGradient id="' + id + 'f" x1="0" y1="' + top + '" x2="0" y2="' + H + '" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="' + L.ink + '"/><stop offset=".42" stop-color="' + L.ink + '"/><stop offset="1" stop-color="' + L.mist + '"/></linearGradient>';
      var art = '<path d="' + body + '" fill="url(#' + id + 'f)"/>';
      if (L.edge) {
        // ink pooling just under the ridge: a wide blurred stroke clipped to the mountain body
        defs += '<clipPath id="' + id + 'c"><path d="' + body + '"/></clipPath>' +
          '<filter id="' + id + 'e" x="-2%" y="-50%" width="104%" height="200%"><feGaussianBlur stdDeviation="' + L.edge[3] + '"/></filter>';
        art += '<g clip-path="url(#' + id + 'c)"><path d="' + ridgeLine + '" fill="none" stroke="' + L.edge[0] + '" stroke-opacity="' + L.edge[1] +
          '" stroke-width="' + L.edge[2] + '" stroke-linejoin="round" filter="url(#' + id + 'e)"/></g>';
      }
      if (L.blur) {
        defs += '<filter id="' + id + 'b" x="-1%" y="-6%" width="102%" height="112%"><feGaussianBlur stdDeviation="' + L.blur + '"/></filter>';
        art = '<g filter="url(#' + id + 'b)">' + art + '</g>';
      }
      var host = ridgeHosts[li];
      host.style.top = top + 'px';
      host.style.height = (hgt + 2) + 'px';
      host.style.left = -pad + 'px';
      host.style.right = -pad + 'px';
      host.innerHTML = '<svg viewBox="' + (-pad) + ' ' + top + ' ' + (W + 2 * pad) + ' ' + (hgt + 2) + '" preserveAspectRatio="none" focusable="false"><defs>' + defs + '</defs>' + art + '</svg>';
    }
  }

  // y of a ridge's crest at hero x
  function ridgeY(li, x) {
    var a = ridgeXY[li];
    if (!a || !a.length) return G.h;
    for (var i = 1; i < a.length; i++) {
      if (a[i][0] >= x) {
        var t = (x - a[i - 1][0]) / ((a[i][0] - a[i - 1][0]) || 1);
        return a[i - 1][1] + (a[i][1] - a[i - 1][1]) * t;
      }
    }
    return a[a.length - 1][1];
  }

  // a canvas laid over a ridge host, in hero coordinates, so it moves with that ridge's parallax
  function ridgeCanvas(li, cls, w, h) {
    var cv = document.createElement('canvas');
    cv.className = cls;
    cv.style.left = RIDGE_PAD + 'px';
    cv.style.top = -ridgeTop[li] + 'px';
    ridgeHosts[li].appendChild(cv);
    return fitCanvas(cv, w, h, Math.min(window.devicePixelRatio || 1, 1.5));
  }

  /* ───────────── 石柱峰（立于云海，承月） ───────────── */

  var moonEl = hero.querySelector('.moon');

  function tinyPine(c, x, y, s, lean, col) {
    c.save();
    c.translate(x, y);
    c.strokeStyle = col;
    c.fillStyle = col;
    c.lineCap = 'round';
    c.lineWidth = Math.max(0.7, s * 0.06);
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(lean * s * 0.1, -s * 0.5, lean * s * 0.22, -s);
    c.stroke();
    var tiers = [[0.42, 0.7], [0.64, 0.56], [0.84, 0.4], [1.0, 0.22]];
    for (var i = 0; i < tiers.length; i++) {
      var t = tiers[i][0], w = tiers[i][1] * s;
      var cx = lean * s * 0.22 * t + lean * w * 0.25, cy = -s * t;
      c.beginPath();
      c.moveTo(cx - w * 0.55, cy + s * 0.05);
      c.bezierCurveTo(cx - w * 0.35, cy - s * 0.14, cx + w * 0.25, cy - s * 0.15, cx + w * 0.55, cy + s * 0.03);
      c.quadraticCurveTo(cx, cy + s * 0.1, cx - w * 0.55, cy + s * 0.05);
      c.fill();
    }
    c.restore();
  }

  function drawPillar(c, cp, p) {
    var n = noise01(p.seed * 7 + 1), r = mulberry32(p.seed * 13 + 5);
    var bottom = cp.bottom, steps = 100, L = [], R = [];
    var Hh = bottom - p.top, lean = p.lean || 0;
    // a couple of ledges stepping the outline
    var notchesL = [r() * 0.5 + 0.1, r() * 0.4 + 0.45], notchesR = [r() * 0.5 + 0.08, r() * 0.4 + 0.5];
    for (var i = 0; i <= steps; i++) {
      var t = i / steps, y = lerp(p.top, bottom, t);
      var half = p.w * 0.5 * (0.62 + 0.38 * Math.pow(t, 0.55) + 0.55 * Math.pow(t, 3.2));
      var cx = p.x + lean * p.w * 0.35 * (1 - t) * (1 - t);
      var nl = 0, nr = 0;
      for (var k = 0; k < 2; k++) {
        if (t > notchesL[k]) nl += p.w * 0.07;
        if (t > notchesR[k]) nr += p.w * 0.06;
      }
      var wl = (fbm01(n, t * 3.6 + 1) - 0.5) * p.w * 0.34 + (n(t * 52 + 9) - 0.5) * p.w * 0.06;
      var wr = (fbm01(n, t * 3.6 + 31) - 0.5) * p.w * 0.34 + (n(t * 52 + 3) - 0.5) * p.w * 0.06;
      L.push([cx - half - nl + wl, y]);
      R.push([cx + half + nr + wr, y]);
    }
    var path = new Path2D();
    path.moveTo(L[steps][0], L[steps][1]);
    for (var a = steps; a >= 0; a--) path.lineTo(L[a][0], L[a][1]);
    var x0 = L[0][0], x1 = R[0][0], capH = p.w * 0.3, capPts = [];
    for (var s = 1; s <= 6; s++) {
      var tt = s / 6, tm = tt - 0.5 / 6;
      var bump = Math.pow(Math.sin(tt * Math.PI), 0.7);
      var xx = lerp(x0, x1, tt), yy = p.top - bump * capH * (0.5 + r() * 0.25);
      var cxp = lerp(x0, x1, tm), cyp = p.top - Math.pow(Math.sin(tm * Math.PI), 0.7) * capH * (0.75 + r() * 0.55);
      path.quadraticCurveTo(cxp, cyp, xx, yy);
      capPts.push([cxp, cyp], [xx, yy]);
    }
    for (var b = 0; b <= steps; b++) path.lineTo(R[b][0], R[b][1]);
    path.closePath();

    var hz = p.haze || 0;
    var top = [Math.round(lerp(14, 32, hz)), Math.round(lerp(20, 42, hz)), Math.round(lerp(38, 70, hz))];
    var mist = [42, 54, 86];
    function mix(f) { return [lerp(top[0], mist[0], f) | 0, lerp(top[1], mist[1], f) | 0, lerp(top[2], mist[2], f) | 0]; }
    var g = c.createLinearGradient(0, p.top - capH, 0, bottom);
    g.addColorStop(0, rgba(top, 1));
    g.addColorStop(0.35, rgba(mix(0.18), 1));
    g.addColorStop(0.8, rgba(mix(0.7), 1));
    g.addColorStop(1, rgba(mist, 1));
    c.fillStyle = g;
    c.fill(path);

    c.save();
    c.clip(path);
    var lightRight = cp.mx > p.x;
    var xs0 = p.x - p.w * 1.2, xs1 = p.x + p.w * 1.2;
    // volume: the side away from the moon is deeper
    var sg = c.createLinearGradient(xs0, 0, xs1, 0);
    var dark = 'rgba(3,5,12,' + (0.5 - hz * 0.3).toFixed(2) + ')', lite = 'rgba(160,176,214,' + (0.09 - hz * 0.04).toFixed(3) + ')';
    if (lightRight) { sg.addColorStop(0.1, dark); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(0.9, lite); }
    else { sg.addColorStop(0.1, lite); sg.addColorStop(0.5, 'rgba(0,0,0,0)'); sg.addColorStop(0.9, dark); }
    c.fillStyle = sg;
    c.fillRect(xs0 - 40, p.top - capH * 2, (xs1 - xs0) + 80, Hh + capH * 3);
    // ink along the shadowed outline
    var E = lightRight ? L : R;
    for (var d = 0; d < 6; d++) {
      c.beginPath();
      for (var e = 0; e <= steps * 0.75; e++) {
        var off = (E === L ? 1 : -1) * d * 1.3;
        if (e) c.lineTo(E[e][0] + off, E[e][1]); else c.moveTo(E[e][0] + off, E[e][1]);
      }
      c.strokeStyle = 'rgba(3,5,12,' + (0.22 * (1 - hz) * (1 - d / 6)).toFixed(3) + ')';
      c.lineWidth = 1.4;
      c.stroke();
    }
    // 皴: a few long vertical texture strokes, more on the shadow side
    var lines = Math.max(3, Math.round(p.w / 9));
    for (var q = 0; q < lines; q++) {
      var fx = lightRight ? Math.pow(r(), 1.4) : 1 - Math.pow(r(), 1.4);
      var ys = p.top + r() * Hh * 0.3, ye = ys + (0.15 + r() * 0.45) * Hh;
      c.beginPath();
      for (var z = 0; z <= 20; z++) {
        var ty = lerp(ys, ye, z / 20);
        var ti = clamp(Math.round((ty - p.top) / Hh * steps), 0, steps);
        var lx = lerp(L[ti][0], R[ti][0], fx) + (n(ty / 34 + q * 5) - 0.5) * 5;
        if (z) c.lineTo(lx, ty); else c.moveTo(lx, ty);
      }
      c.strokeStyle = 'rgba(3,5,12,' + ((0.12 + r() * 0.2) * (1 - hz * 0.6)).toFixed(3) + ')';
      c.lineWidth = 0.8 + r() * 1.6;
      c.stroke();
    }
    var m = c.createLinearGradient(0, bottom - Hh * 0.6, 0, bottom);
    m.addColorStop(0, rgba(mist, 0));
    m.addColorStop(1, rgba(mist, 0.96));
    c.fillStyle = m;
    c.fillRect(xs0 - 40, p.top, (xs1 - xs0) + 80, Hh);
    c.restore();

    // rim light on the moon side
    var edge = lightRight ? R : L, span = Math.round(steps * (cp.portrait ? 0.3 : 0.5));
    c.save();
    c.lineWidth = 1;
    for (var e2 = 1; e2 < span; e2++) {
      var al = (p.main ? (cp.portrait ? 0.2 : 0.38) : 0.22 * (1 - hz)) * Math.pow(1 - e2 / span, 1.5);
      c.strokeStyle = 'rgba(206,214,236,' + al.toFixed(3) + ')';
      c.beginPath(); c.moveTo(edge[e2 - 1][0], edge[e2 - 1][1]); c.lineTo(edge[e2][0], edge[e2][1]); c.stroke();
    }
    c.beginPath();
    c.moveTo(x0, p.top);
    for (var k2 = 0; k2 < capPts.length; k2 += 2) c.quadraticCurveTo(capPts[k2][0], capPts[k2][1], capPts[k2 + 1][0], capPts[k2 + 1][1]);
    c.strokeStyle = 'rgba(206,214,236,' + (p.main ? 0.3 : 0.14 * (1 - hz)).toFixed(3) + ')';
    c.stroke();
    c.restore();

    // moss dots on the summit
    var dotCol = rgba(top.map(function (v) { return Math.max(0, v - 9); }), 1);
    c.fillStyle = dotCol;
    var clusters = p.main ? 7 : 4;
    for (var cl = 0; cl < clusters; cl++) {
      var u = 0.08 + r() * 0.84;
      var bx = lerp(x0, x1, u), by = p.top - Math.pow(Math.sin(u * Math.PI), 0.7) * capH * 0.62;
      var dots = 3 + Math.floor(r() * 5);
      for (var dd = 0; dd < dots; dd++) {
        c.beginPath();
        c.ellipse(bx + (r() - 0.5) * p.w * 0.16, by - r() * p.w * 0.05 + 1, 0.9 + r() * 1.5, 0.7 + r() * 1.1, 0, 0, TAU);
        c.fill();
      }
    }
    if (p.main && !cp.portrait) {
      // a small pine on the main summit, leaning towards the moon
      var u2 = 0.36;
      tinyPine(c, lerp(x0, x1, u2), p.top - Math.pow(Math.sin(u2 * Math.PI), 0.7) * capH * 0.6 + 1, p.w * 0.3, lightRight ? 1 : -1, dotCol);
    }
  }

  function paintPillars() {
    var W = G.w, H = G.h;
    var mr = moonEl.getBoundingClientRect(), hr = hero.getBoundingClientRect();
    var mx = mr.left + mr.width / 2 - hr.left, my = mr.top + mr.height / 2 - hr.top, mrad = mr.width / 2;
    var cp = { mx: mx, portrait: G.portrait, bottom: H * (G.portrait ? 0.8 : 0.84) };
    var list = G.portrait ? [
      { x: W * 0.33, top: H * 0.63, w: 22, seed: 8, haze: 0.55, lean: 0.4 },
      { x: W * 0.1, top: H * 0.555, w: 34, seed: 3, haze: 0.12, lean: 0.3, main: true }
    ] : [
      { x: W * 0.968, top: H * 0.5, w: clamp(W * 0.04, 40, 72), seed: 13, haze: 0.32, lean: -0.5 },
      { x: W * 0.905, top: H * 0.565, w: clamp(W * 0.03, 30, 54), seed: 21, haze: 0.5, lean: -0.3 },
      { x: W * 0.79, top: H * 0.6, w: clamp(W * 0.024, 24, 44), seed: 31, haze: 0.62, lean: -0.2 },
      { x: mx + mrad * 0.2, top: my + mrad * 2.4, w: clamp(W * 0.055, 56, 98), seed: 3, haze: 0, lean: 0.35, main: true }
    ];
    var c = ridgeCanvas(1, 'pillars', W, H);
    for (var i = 0; i < list.length; i++) drawPillar(c, cp, list[i]);
  }

  /* ───────────── 崖上探身松（只在横屏） ───────────── */

  function needleFan(c, x, y, R, rot, spread, nLines, r) {
    for (var i = 0; i < nLines; i++) {
      var a = rot + (i / (nLines - 1) - 0.5) * spread + (r() - 0.5) * 0.08;
      var len = R * (0.85 + r() * 0.25);
      c.lineWidth = 0.8 + r() * 0.45;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * R * 0.1, y + Math.sin(a) * R * 0.1);
      c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len * 0.62);
      c.stroke();
    }
  }
  function needlePad(c, cx, cy, w, R, r, col) {
    // one cluster of needles: the upper row fans up, the lower row droops
    c.fillStyle = col;
    c.globalAlpha = 0.85;
    c.beginPath();
    c.ellipse(cx, cy + R * 0.12, w * 0.5, R * 0.28, 0, 0, TAU);
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = col;
    var count = Math.max(2, Math.round(w / (R * 0.75)));
    for (var i = 0; i < count; i++) {
      var fx = cx - w * 0.5 + (i + 0.5) * (w / count) + (r() - 0.5) * R * 0.3;
      var fy = cy + (r() - 0.5) * R * 0.18;
      needleFan(c, fx, fy, R * (0.9 + r() * 0.25), -Math.PI / 2 + (r() - 0.5) * 0.25, 2.5, 13, r);
      if (r() < 0.7) needleFan(c, fx + (r() - 0.5) * R * 0.3, fy + R * 0.12, R * 0.6, Math.PI / 2, 1.9, 8, r);
    }
  }
  function taperedStroke(c, P, w0, w1, col) {
    // a cubic Bézier whose width tapers from w0 to w1
    var N = 30, Lp = [], Rp = [];
    for (var i = 0; i <= N; i++) {
      var t = i / N, mt = 1 - t;
      var x = mt * mt * mt * P[0][0] + 3 * mt * mt * t * P[1][0] + 3 * mt * t * t * P[2][0] + t * t * t * P[3][0];
      var y = mt * mt * mt * P[0][1] + 3 * mt * mt * t * P[1][1] + 3 * mt * t * t * P[2][1] + t * t * t * P[3][1];
      var dx = 3 * mt * mt * (P[1][0] - P[0][0]) + 6 * mt * t * (P[2][0] - P[1][0]) + 3 * t * t * (P[3][0] - P[2][0]);
      var dy = 3 * mt * mt * (P[1][1] - P[0][1]) + 6 * mt * t * (P[2][1] - P[1][1]) + 3 * t * t * (P[3][1] - P[2][1]);
      var len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
      var w = lerp(w0, w1, Math.pow(t, 0.8)) / 2;
      Lp.push([x + nx * w, y + ny * w]);
      Rp.push([x - nx * w, y - ny * w]);
    }
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(Lp[0][0], Lp[0][1]);
    for (var a = 1; a <= N; a++) c.lineTo(Lp[a][0], Lp[a][1]);
    for (var b = N; b >= 0; b--) c.lineTo(Rp[b][0], Rp[b][1]);
    c.closePath();
    c.fill();
  }

  function paintPine() {
    if (G.portrait || G.w < 760) return;
    var W = G.w, H = G.h, r = mulberry32(405);
    var S = Math.min(W * 0.105, H * 0.19);
    var bx = W * 0.05, by = ridgeY(3, bx) + 3;
    var c = ridgeCanvas(3, 'pine', Math.round(bx + S * 1.6), H);
    var col = '#0a0e1b';
    c.save();
    c.lineCap = 'round';
    taperedStroke(c, [[bx, by + 4], [bx - S * 0.1, by - S * 0.35], [bx + S * 0.28, by - S * 0.5], [bx + S * 0.5, by - S * 0.66]], S * 0.085, S * 0.04, col);
    taperedStroke(c, [[bx + S * 0.12, by - S * 0.42], [bx + S * 0.45, by - S * 0.46], [bx + S * 0.8, by - S * 0.36], [bx + S * 1.2, by - S * 0.42]], S * 0.04, S * 0.012, col);
    taperedStroke(c, [[bx + S * 0.48, by - S * 0.64], [bx + S * 0.7, by - S * 0.74], [bx + S * 0.95, by - S * 0.7], [bx + S * 1.18, by - S * 0.78]], S * 0.035, S * 0.01, col);
    taperedStroke(c, [[bx + S * 0.42, by - S * 0.6], [bx + S * 0.36, by - S * 0.8], [bx + S * 0.45, by - S * 0.92], [bx + S * 0.62, by - S * 1.02]], S * 0.03, S * 0.01, col);
    c.restore();
    var pads = [
      [bx + S * 1.06, by - S * 0.45, S * 0.42, S * 0.11],
      [bx + S * 0.66, by - S * 0.47, S * 0.3, S * 0.095],
      [bx + S * 1.04, by - S * 0.8, S * 0.4, S * 0.11],
      [bx + S * 0.74, by - S * 0.78, S * 0.26, S * 0.09],
      [bx + S * 0.6, by - S * 1.04, S * 0.3, S * 0.095],
      [bx + S * 0.3, by - S * 0.54, S * 0.18, S * 0.08]
    ];
    for (var i = 0; i < pads.length; i++) needlePad(c, pads[i][0], pads[i][1], pads[i][2], pads[i][3], r, col);
    // a touch of moonlight on the upper edge of the needles
    c.save();
    c.globalCompositeOperation = 'source-atop';
    var lg = c.createLinearGradient(0, by - S * 1.2, 0, by - S * 0.35);
    lg.addColorStop(0, 'rgba(150,166,206,.16)');
    lg.addColorStop(0.5, 'rgba(150,166,206,0)');
    c.fillStyle = lg;
    c.fillRect(bx - S * 0.2, by - S * 1.3, S * 1.8, S * 1.0);
    c.restore();
  }

  /* ───────────── cloud sea (云海) ───────────── */

  // two banks of flat, moon-lit billows that fill the valley; the formation sinks into them
  var CLOUDS = {
    land: [
      { top: 0.768, seed: 41, w: [110, 230], flat: [0.13, 0.22], jit: 7, blur: 2.6,
        g: [['#8a98bd', 0.24], ['#3a486e', 0.62], ['#1b2541', 0.96], ['#141c31', 1]] },
      { top: 0.808, seed: 47, w: [90, 200], flat: [0.14, 0.24], jit: 6, blur: 2.2,
        g: [['#8592b6', 0.2], ['#2f3c61', 0.72], ['#172038', 1], ['#111829', 1]] }
    ],
    port: [
      { top: 0.73, seed: 43, w: [60, 130], flat: [0.13, 0.22], jit: 5, blur: 2,
        g: [['#8a98bd', 0.24], ['#3a486e', 0.62], ['#1b2541', 0.96], ['#141c31', 1]] },
      { top: 0.77, seed: 49, w: [50, 120], flat: [0.14, 0.24], jit: 5, blur: 1.8,
        g: [['#8592b6', 0.2], ['#2f3c61', 0.72], ['#172038', 1], ['#111829', 1]] }
    ]
  };
  var cloudHosts = [hero.querySelector('.cloud-1'), hero.querySelector('.cloud-2')];

  function buildClouds() {
    var set = G.portrait ? CLOUDS.port : CLOUDS.land, W = G.w, H = G.h, pad = 90;
    for (var ci = 0; ci < 2; ci++) {
      var C = set[ci], rnd = mulberry32(C.seed), y0 = C.top * H, ph = rnd() * 6.28;
      var level = function (xx) { return y0 + Math.sin(xx / W * 7.5 + ph) * C.jit * 1.4; };   // the bank swells and dips
      var x = -pad, d = 'M' + x + ',' + r2(level(x));
      while (x < W + pad) {
        var big = rnd() < 0.18;
        var w = (C.w[0] + rnd() * (C.w[1] - C.w[0])) * (big ? 1.7 : 1);
        var nx = x + w, ny = level(nx) + (rnd() - 0.5) * 2 * C.jit;
        var rx = w / 2, ry = rx * (C.flat[0] + rnd() * (C.flat[1] - C.flat[0])) * (big ? 1.25 : 1);
        if (rnd() < 0.12) d += 'L' + r2(nx) + ',' + r2(ny);                     // a flat stretch now and then
        else d += 'A' + r2(rx) + ' ' + r2(ry) + ' 0 0 1 ' + r2(nx) + ',' + r2(ny);
        x = nx;
      }
      d += 'L' + r2(x) + ',' + (H + 4) + 'L' + (-pad) + ',' + (H + 4) + 'Z';
      var top = Math.floor(y0 - C.jit * 2.6 - C.w[1] * 0.85 * C.flat[1] * 1.25 - 10);
      var id = 'cl' + ci, g = C.g;
      var svg = '<svg viewBox="' + (-pad) + ' ' + top + ' ' + (W + 2 * pad) + ' ' + (H + 4 - top) + '" preserveAspectRatio="none" focusable="false"><defs>' +
        '<linearGradient id="' + id + 'g" x1="0" y1="' + r2(y0 - 18) + '" x2="0" y2="' + r2(y0 + 150) + '" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0" stop-color="' + g[0][0] + '" stop-opacity="' + g[0][1] + '"/>' +
        '<stop offset=".2" stop-color="' + g[1][0] + '" stop-opacity="' + g[1][1] + '"/>' +
        '<stop offset=".55" stop-color="' + g[2][0] + '" stop-opacity="' + g[2][1] + '"/>' +
        '<stop offset="1" stop-color="' + g[3][0] + '" stop-opacity="' + g[3][1] + '"/></linearGradient>' +
        '<filter id="' + id + 'b" x="-2%" y="-10%" width="104%" height="120%"><feGaussianBlur stdDeviation="' + C.blur + '"/></filter></defs>' +
        '<path d="' + d + '" fill="url(#' + id + 'g)" filter="url(#' + id + 'b)"/></svg>';
      var host = cloudHosts[ci];
      host.style.top = top + 'px';
      host.style.height = (H + 4 - top) + 'px';
      host.firstElementChild.innerHTML = svg;
    }
  }

  /* ───────────── stars ───────────── */

  var starCanvas = hero.querySelector('.stars');
  function drawStars() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    starCanvas.width = Math.round(G.w * dpr);
    starCanvas.height = Math.round(G.h * dpr);
    var c = starCanvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, G.w, G.h);
    var rnd = mulberry32(1207);
    var n = Math.round(G.w * G.h / (G.portrait ? 3400 : 5600));
    for (var i = 0; i < n; i++) {
      var x = rnd() * G.w, y = Math.pow(rnd(), 1.3) * G.h * 0.76;
      var dx = x - G.cx, dy = y - G.cy;
      if (dx * dx / 0.12 + dy * dy / 0.6 < G.R * G.R * 0.3) continue;   // keep the name's column clear
      var r = 0.3 + Math.pow(rnd(), 3.2) * 1.05;
      var fadeLow = 1 - Math.min(1, y / (G.h * 0.78));
      c.globalAlpha = (0.16 + rnd() * 0.6) * (0.35 + 0.65 * fadeLow);
      c.fillStyle = rnd() < 0.18 ? '#f3e6c6' : '#dce4f6';
      c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill();
    }
    // a handful of brighter stars with a faint glow
    for (i = 0; i < (G.portrait ? 5 : 9); i++) {
      x = rnd() * G.w; y = rnd() * G.h * 0.5;
      var g = c.createRadialGradient(x, y, 0, x, y, 6);
      g.addColorStop(0, 'rgba(240,236,224,.85)');
      g.addColorStop(0.25, 'rgba(210,220,245,.25)');
      g.addColorStop(1, 'rgba(210,220,245,0)');
      c.globalAlpha = 0.5 + rnd() * 0.4;
      c.fillStyle = g;
      c.fillRect(x - 6, y - 6, 12, 12);
    }
    c.globalAlpha = 1;
  }

  /* ───────────── spirit motes & sword qi ───────────── */

  var moteCanvas = hero.querySelector('.motes');
  var mctx = moteCanvas.getContext('2d');
  var motes = [], ripples = [], slashes = [], twinklers = [];
  var MOTE_N = 0;
  var clock = 0, goAt = -1, flare = 0;
  var ptr = { on: false, x: 0, y: 0, vx: 0, vy: 0, t: 0, until: 0 };
  var par = { x: 0, y: 0, tx: 0, ty: 0 };

  function makeSprite(r, g, b) {
    var s = document.createElement('canvas');
    s.width = s.height = 64;
    var c = s.getContext('2d');
    var gr = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,250,236,1)');
    gr.addColorStop(0.1, 'rgba(' + r + ',' + g + ',' + b + ',.95)');
    gr.addColorStop(0.28, 'rgba(' + r + ',' + g + ',' + b + ',.28)');
    gr.addColorStop(0.6, 'rgba(' + r + ',' + g + ',' + b + ',.06)');
    gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    c.fillStyle = gr;
    c.fillRect(0, 0, 64, 64);
    return s;
  }
  var SPR = [makeSprite(242, 223, 174), makeSprite(217, 181, 108), makeSprite(214, 224, 246)];

  function seedMote(p, mode, initial) {
    var R = G.R;
    p.mode = mode;
    p.size = 0.7 + Math.pow(Math.random(), 2.4) * 2.3;
    p.a = 0.5 + Math.random() * 0.5;
    p.tw = 0.5 + Math.random() * 1.8;
    p.tp = Math.random() * 6.283;
    p.spr = Math.random() < 0.55 ? 0 : (Math.random() < 0.7 ? 1 : 2);
    p.captured = false;
    if (mode === 'orbit') {
      var rho = R * (0.3 + Math.pow(Math.random(), 0.85) * 0.9);
      var th = Math.random() * 6.2832;
      p.x = G.cx + rho * Math.cos(th);
      p.y = G.cy + rho * Math.sin(th);
      p.rho = rho;
      p.dir = Math.random() < 0.64 ? 1 : -1;
      p.w = (0.045 + Math.random() * 0.06) * Math.sqrt(R / rho);
      var vt = p.w * rho * p.dir;
      p.vx = -Math.sin(th) * vt;
      p.vy = Math.cos(th) * vt;
      p.life = 12 + Math.random() * 26;
    } else {
      p.x = G.cx + (Math.random() + Math.random() - 1) * G.w * 0.48;
      p.y = initial ? G.h * (0.42 + Math.random() * 0.58) : G.h * (0.8 + Math.random() * 0.22);
      p.rise = 9 + Math.random() * 20;
      p.swA = 5 + Math.random() * 12;
      p.swF = 0.25 + Math.random() * 0.5;
      p.vx = 0;
      p.vy = -p.rise;
      p.life = 10 + Math.random() * 16;
    }
    p.age = initial ? Math.random() * p.life * 0.75 : 0;
  }

  function initMotes() {
    MOTE_N = (G.portrait || G.w < 760) ? 56 : 130;
    motes = [];
    for (var i = 0; i < MOTE_N; i++) {
      var p = {};
      seedMote(p, Math.random() < 0.7 ? 'orbit' : 'rise', true);
      motes.push(p);
    }
    twinklers = [];
    var rnd = mulberry32(99);
    for (i = 0; i < (G.portrait ? 4 : 8); i++) {
      twinklers.push({ x: rnd() * G.w, y: rnd() * G.h * 0.55, s: 1.6 + rnd() * 1.6, f: 0.3 + rnd() * 0.7, p: rnd() * 6.28 });
    }
  }

  function sizeMoteCanvas() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    moteCanvas.width = Math.round(G.w * dpr);
    moteCanvas.height = Math.round(G.h * dpr);
    mctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function burst() {
    flare = 1;
    for (var i = 0; i < motes.length; i++) {
      var p = motes[i], dx = p.x - G.cx, dy = p.y - G.cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var f = Math.max(0.25, 1 - d / (G.R * 1.6));
      var s = (110 + Math.random() * 170) * f;
      p.vx += dx / d * s - dy / d * s * 0.3;
      p.vy += dy / d * s + dx / d * s * 0.3;
    }
  }

  function ripple(x, y) {
    ripples.push({ x: x, y: y, t: 0 });
    if (ripples.length > 4) ripples.shift();
    for (var i = 0; i < motes.length; i++) {
      var p = motes[i], dx = p.x - x, dy = p.y - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > 190) continue;
      var f = 1 - d / 190;
      p.vx += (dx / d * 150 - dy / d * 90) * f;
      p.vy += (dy / d * 150 + dx / d * 90) * f;
    }
  }

  // 剑气: a crescent cut where the visitor clicks or taps
  function slashAt(x, y) {
    slashes.push({ x: x, y: y, t: 0, rot: Math.random() * TAU, r: 58 + Math.random() * 46, dir: Math.random() < 0.5 ? 1 : -1 });
    if (slashes.length > 6) slashes.shift();
  }
  function drawSlash(c, s) {
    var t = s.t / 0.5;
    if (t >= 1) return;
    var e = 1 - Math.pow(1 - t, 3);
    var R = s.r * (0.72 + 0.28 * e);
    var span = 1.2 * (0.3 + 0.7 * e);                 // half-angle of the cut
    var mid = s.rot + s.dir * e * 0.55;               // the edge swings as it cuts
    var a0 = mid - span, a1 = mid + span;
    var d = R * 0.42 * (1 - t * 0.55);                // offset of the inner circle → crescent thickness
    var Ri = Math.sqrt(R * R + d * d + 2 * R * d * Math.cos(span));
    var cx2 = s.x - d * Math.cos(mid), cy2 = s.y - d * Math.sin(mid);
    var i0 = Math.atan2(s.y + R * Math.sin(a0) - cy2, s.x + R * Math.cos(a0) - cx2);
    var i1 = Math.atan2(s.y + R * Math.sin(a1) - cy2, s.x + R * Math.cos(a1) - cx2);
    var alpha = Math.pow(1 - t, 1.5);
    var g = c.createRadialGradient(s.x, s.y, Math.max(1, R - d * 1.1), s.x, s.y, R);
    g.addColorStop(0, 'rgba(217,181,108,0)');
    g.addColorStop(0.65, 'rgba(242,223,174,.5)');
    g.addColorStop(1, 'rgba(255,250,236,1)');
    c.globalAlpha = alpha * 0.9;
    c.fillStyle = g;
    c.beginPath();
    c.arc(s.x, s.y, R, a0, a1, false);
    c.arc(cx2, cy2, Ri, i1, i0, true);
    c.closePath();
    c.fill();
    c.globalAlpha = alpha;
    c.strokeStyle = '#fffaf0';
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(s.x, s.y, R, a0 + span * 0.12, a1 - span * 0.12, false);
    c.stroke();
  }

  function stepMotes(dt) {
    var R = G.R, RC = G.portrait ? 170 : 230, VR = G.portrait ? 52 : 72, VS = G.portrait ? 190 : 250;
    var vortexOn = ptr.on && (ptr.until === 0 || clock < ptr.until);
    for (var i = 0; i < motes.length; i++) {
      var p = motes[i];
      p.age += dt;
      var dx = p.x - G.cx, dy = p.y - G.cy, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var ux = dx / d, uy = dy / d, k, tvx, tvy;
      if (p.mode === 'orbit') {
        var vt = p.w * p.rho;
        tvx = -uy * p.dir * vt + ux * (p.rho - d) * 0.9;
        tvy = ux * p.dir * vt + uy * (p.rho - d) * 0.9;
        k = Math.min(1, 1.3 * dt);
      } else {
        tvx = Math.sin(clock * p.swF + p.tp) * p.swA;
        tvy = -p.rise;
        if (!p.captured && d < R * 1.06 && p.age > 1.5) {
          p.captured = true;
          if (Math.random() < 0.55) {            // drawn into the formation
            p.mode = 'orbit';
            p.rho = Math.max(R * 0.32, Math.min(R * 1.1, d * 0.96));
            p.dir = Math.random() < 0.64 ? 1 : -1;
            p.w = (0.045 + Math.random() * 0.06) * Math.sqrt(R / p.rho);
            p.life = p.age + 8 + Math.random() * 14;
          }
        }
        k = Math.min(1, 0.8 * dt);
      }
      p.vx += (tvx - p.vx) * k;
      p.vy += (tvy - p.vy) * k;

      if (vortexOn) {
        // motes near the cursor (or a tap) are drawn into a small whirl around it
        var mx = p.x - ptr.x, my = p.y - ptr.y, md = Math.sqrt(mx * mx + my * my);
        if (md < RC && md > 0.5) {
          var f = 1 - md / RC; f = f * f * (3 - 2 * f);
          var pull = (VR - md) * 2.4;
          var vxT = -my / md * VS + mx / md * pull, vyT = mx / md * VS + my / md * pull;
          var kk = Math.min(1, 3.2 * dt) * f;
          p.vx += (vxT - p.vx) * kk + ptr.vx * f * 0.02;
          p.vy += (vyT - p.vy) * kk + ptr.vy * f * 0.02;
        }
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      var out = p.x < -60 || p.x > G.w + 60 || p.y < -60 || p.y > G.h + 60;
      if (p.age > p.life || out || (p.mode === 'rise' && p.y < G.h * 0.16)) {
        seedMote(p, Math.random() < 0.38 ? 'orbit' : 'rise', false);
      }
    }
    for (i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t += dt;
      if (ripples[i].t > 1.4) ripples.splice(i, 1);
    }
    for (i = slashes.length - 1; i >= 0; i--) {
      slashes[i].t += dt;
      if (slashes[i].t > 0.5) slashes.splice(i, 1);
    }
    flare = Math.max(0, flare - dt * 0.8);
    ptr.vx *= 0.85; ptr.vy *= 0.85;
  }

  function smooth(e0, e1, x) { var t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); }

  function drawMotes() {
    var c = mctx;
    c.clearRect(0, 0, G.w, G.h);
    var master = !ANIM ? 1 : (goAt < 0 ? 0 : smooth(0.4, 2.0, clock - goAt));
    if (master <= 0) return;
    c.globalCompositeOperation = 'lighter';
    for (var i = 0; i < twinklers.length; i++) {
      var tw = twinklers[i], ta = 0.18 + 0.3 * (0.5 + 0.5 * Math.sin(clock * tw.f * 2 + tw.p));
      c.globalAlpha = ta * master;
      var ts = tw.s * 5;
      c.drawImage(SPR[2], tw.x - ts / 2, tw.y - ts / 2, ts, ts);
    }
    for (i = 0; i < motes.length; i++) {
      var p = motes[i];
      var env = smooth(0, 1.6, p.age) * smooth(0, 2.2, p.life - p.age);
      if (p.mode === 'rise') env *= smooth(G.h * 0.16, G.h * 0.44, p.y);
      var twk = 0.7 + 0.3 * Math.sin(clock * p.tw * 2.4 + p.tp);
      var a = p.a * env * twk * master * (1 + flare * 0.9);
      if (a < 0.01) continue;
      c.globalAlpha = Math.min(1, a);
      var s = p.size * 9 * (1 + flare * 0.35);
      c.drawImage(SPR[p.spr], p.x - s / 2, p.y - s / 2, s, s);
    }
    for (i = 0; i < slashes.length; i++) drawSlash(c, slashes[i]);
    c.globalCompositeOperation = 'source-over';
    for (i = 0; i < ripples.length; i++) {
      var rp = ripples[i];
      var e = 1 - Math.pow(1 - Math.min(1, rp.t / 1.2), 3);
      c.globalAlpha = Math.max(0, 0.32 * (1 - rp.t / 1.2));
      c.strokeStyle = '#f2dfae';
      c.lineWidth = 0.9;
      c.beginPath();
      c.arc(rp.x, rp.y, 6 + e * 110, 0, 6.2832);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  /* parallax (desktop pointer only) — uses the individual `translate` property so it composes with CSS animations */
  var arrayEl = hero.querySelector('.array');
  var moonEls = [moonEl, hero.querySelector('.moon-halo')];
  function applyParallax(dt) {
    var k = Math.min(1, dt * 2.2);
    par.x += (par.tx - par.x) * k;
    par.y += (par.ty - par.y) * k;
    if (Math.abs(par.x - par.tx) < 0.0005 && Math.abs(par.y - par.ty) < 0.0005 && par.still) return;
    par.still = Math.abs(par.x - par.tx) < 0.0005 && Math.abs(par.y - par.ty) < 0.0005;
    arrayEl.style.translate = r2(-par.x * 10) + 'px ' + r2(-par.y * 7) + 'px';
    for (var i = 0; i < 5; i++) ridgeHosts[i].style.translate = r2(-par.x * (3 + i * 4.5)) + 'px ' + r2(-par.y * (1 + i)) + 'px';
    cloudHosts[0].style.translate = r2(-par.x * 13) + 'px ' + r2(-par.y * 3) + 'px';
    cloudHosts[1].style.translate = r2(-par.x * 15) + 'px ' + r2(-par.y * 3.5) + 'px';
    moonEls[0].style.translate = moonEls[1].style.translate = r2(-par.x * 4) + 'px ' + r2(-par.y * 3) + 'px';
  }

  var running = false, last = 0, heroVisible = true;
  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    clock += dt;
    stepMotes(dt);
    drawMotes();
    if (FINE) applyParallax(dt);
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || !ANIM) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  function heroPoint(e) {
    var r = hero.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  if (ANIM) {
    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var q = heroPoint(e), now = performance.now();
      var dtm = Math.max(8, now - (ptr.t || now - 16));
      if (ptr.on) { ptr.vx = (q.x - ptr.x) / dtm * 1000; ptr.vy = (q.y - ptr.y) / dtm * 1000; }
      ptr.x = q.x; ptr.y = q.y; ptr.t = now; ptr.on = true; ptr.until = 0;
      par.tx = q.x / G.w - 0.5;
      par.ty = q.y / G.h - 0.5;
      par.still = false;
    }, { passive: true });
    hero.addEventListener('pointerleave', function () { ptr.on = false; par.tx = 0; par.ty = 0; par.still = false; });
    hero.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('a, .seal')) return;
      var q = heroPoint(e);
      ripple(q.x, q.y);
      slashAt(q.x, q.y);
      if (e.pointerType !== 'mouse') {            // touch: a short-lived whirl where the finger landed
        ptr.x = q.x; ptr.y = q.y; ptr.vx = ptr.vy = 0;
        ptr.on = true; ptr.until = clock + 1.6;
      }
    }, { passive: true });
  }

  /* ───────────── visibility ───────────── */

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      heroVisible = entries[0].isIntersecting;
      hero.classList.toggle('paused', !heroVisible);
      if (heroVisible && !document.hidden) start(); else stop();
    }, { threshold: 0 }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (heroVisible) start();
  });

  /* ───────────── layout ───────────── */

  function paintLandscape() {
    buildRidges();
    paintPillars();
    paintPine();
    buildClouds();
  }

  function layoutAll() {
    measure();
    buildArray();
    paintLandscape();
    drawStars();
    sizeMoteCanvas();
    initMotes();
  }

  var lastW = 0, lastH = 0, rzTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(function () {
      var w = hero.clientWidth, h = hero.clientHeight;
      if (w === lastW && Math.abs(h - lastH) < 90) return;    // ignore mobile toolbar jitter
      var oldR = G.R;
      measure();
      lastW = G.w; lastH = G.h;
      if (G.R !== oldR) buildArray();
      paintLandscape();
      drawStars();
      sizeMoteCanvas();
      initMotes();
      if (!ANIM) drawMotes();
    }, 180);
  });

  layoutAll();
  lastW = G.w; lastH = G.h;

  /* ───────────── 系统提示 ───────────── */

  var sysBox = document.getElementById('sys');
  function say(tag, text, opt) {
    if (!sysBox) return;
    opt = opt || {};
    var el = document.createElement('div');
    el.className = 'sys-item' + (opt.kind ? ' is-' + opt.kind : '');
    var tg = document.createElement('span');
    tg.className = 'sys-tag';
    tg.setAttribute('aria-hidden', 'true');
    tg.textContent = tag;
    var tx = document.createElement('span');
    tx.className = 'sys-text';
    tx.setAttribute('aria-hidden', 'true');
    var sr = document.createElement('span');
    sr.className = 'sr';
    sr.textContent = '【' + tag + '】' + text;
    el.appendChild(tg); el.appendChild(tx); el.appendChild(sr);
    sysBox.appendChild(el);
    while (sysBox.children.length > 2) sysBox.removeChild(sysBox.firstElementChild);
    el.getBoundingClientRect();                   // commit the start state so the entrance transition runs
    el.classList.add('in');
    if (ANIM) {
      var i = 0;
      (function type() { tx.textContent = text.slice(0, ++i); if (i < text.length) setTimeout(type, 36); })();
    } else {
      tx.textContent = text;
    }
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700);
    }, opt.hold || 5600);
  }

  window.dongfuSay = say;                         // games.js reports results through the same toasts

  function introToasts() {
    setTimeout(function () { say('叮', '检测到道友神识降临'); }, ANIM ? 350 : 120);
  }

  /* ───────────── choreography ───────────── */

  function go() {
    if (doc.classList.contains('go')) return;
    doc.classList.add('go');
    goAt = clock;
    setTimeout(function () {
      doc.classList.add('live');
      burst();
      introToasts();
      setTimeout(function () { doc.classList.add('settled'); }, 1500);   // retire the pulse layers
    }, 2040);
  }

  if (ANIM) {
    start();
    requestAnimationFrame(go);
  } else {
    // reduced motion: one still frame of motes, nothing moves
    goAt = -1;
    drawMotes();
    introToasts();
  }

  /* ───────────── 彩蛋：万剑归宗 ───────────── */

  function drawSword(c, x, y, dx, dy, len, w) {
    // (x, y) is the tip; the sword flies along (dx, dy)
    var tx = x - dx * len, ty = y - dy * len;
    var gx = tx + dx * len * 0.24, gy = ty + dy * len * 0.24;
    var trail = c.createLinearGradient(x, y, x - dx * len * 3.4, y - dy * len * 3.4);
    trail.addColorStop(0, 'rgba(242,223,174,.5)');
    trail.addColorStop(1, 'rgba(242,223,174,0)');
    c.globalAlpha = 0.6;
    c.strokeStyle = trail;
    c.lineWidth = w * 3.2;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - dx * len * 3.4, y - dy * len * 3.4); c.stroke();
    c.globalAlpha = 1;
    c.strokeStyle = '#fff8e8';
    c.lineWidth = w;
    c.beginPath(); c.moveTo(x, y); c.lineTo(gx, gy); c.stroke();
    var gw = len * 0.13;
    c.strokeStyle = 'rgba(242,223,174,.95)';
    c.lineWidth = w * 1.5;
    c.beginPath(); c.moveTo(gx + dy * gw, gy - dx * gw); c.lineTo(gx - dy * gw, gy + dx * gw); c.stroke();
    c.strokeStyle = 'rgba(217,181,108,.9)';
    c.lineWidth = w * 1.7;
    c.beginPath(); c.moveTo(gx, gy); c.lineTo(tx, ty); c.stroke();
  }

  var swordsBusy = false;
  function wanJian() {
    if (swordsBusy) return;
    swordsBusy = true;
    say('剑来', '万剑归宗！', { kind: 'sword', hold: 4200 });
    setTimeout(function () { say('成就', '隐藏成就「剑来」已解锁', { kind: 'ach' }); }, 1500);
    if (!ANIM) { swordsBusy = false; return; }
    if (heroVisible) burst();
    var cv = document.createElement('canvas');
    cv.className = 'swords';
    cv.setAttribute('aria-hidden', 'true');
    document.body.appendChild(cv);
    var W = window.innerWidth, H = window.innerHeight;
    var c = fitCanvas(cv, W, H, Math.min(window.devicePixelRatio || 1, 1.5));
    var dirA = 0.5, dx = -Math.sin(dirA), dy = Math.cos(dirA);        // falling down and to the left
    var N = W < 760 ? 28 : 52, list = [];
    for (var i = 0; i < N; i++) {
      list.push({
        x: W * (0.1 + Math.random() * 1.15), y: -40 - Math.random() * 160,
        len: 40 + Math.random() * 48, v: 1500 + Math.random() * 1200,
        d: Math.random() * 1.1, w: 1 + Math.random() * 1.2
      });
    }
    var t0 = performance.now();
    (function step(now) {
      var t = (now - t0) / 1000, alive = false;
      c.clearRect(0, 0, W, H);
      c.globalCompositeOperation = 'lighter';
      for (var k = 0; k < list.length; k++) {
        var p = list[k], tt = t - p.d;
        if (tt < 0) { alive = true; continue; }
        var x = p.x + dx * p.v * tt, y = p.y + dy * p.v * tt;
        if (y - p.len > H + 40 || x + p.len < -60) continue;
        alive = true;
        drawSword(c, x, y, dx, dy, p.len, p.w);
      }
      if (alive && t < 5) requestAnimationFrame(step);
      else { if (cv.parentNode) cv.parentNode.removeChild(cv); swordsBusy = false; }
    })(t0);
  }

  var keyBuf = '';
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = (e.key || '').toLowerCase();
    if (k.length !== 1 || k < 'a' || k > 'z') return;
    keyBuf = (keyBuf + k).slice(-7);
    if (keyBuf === 'jianlai') { keyBuf = ''; wanJian(); }
  });
  var sealEl = hero.querySelector('.seal'), sealTaps = [];
  if (sealEl) {
    sealEl.addEventListener('pointerdown', function () {
      var now = Date.now();
      sealTaps = sealTaps.filter(function (t) { return now - t < 1200; });
      sealTaps.push(now);
      if (sealTaps.length >= 3) { sealTaps = []; wanJian(); }
    });
  }

  /* ───────────── 丹炉 ───────────── */

  function quatrefoil(cx, cy, R) {
    // 海棠窗: four lobes
    var d = '', N = 72;
    for (var i = 0; i <= N; i++) {
      var a = i / N * TAU;
      var rr = R * (0.8 + 0.2 * Math.abs(Math.cos(2 * a + Math.PI / 2)));
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(2) + ' ' + (cy + Math.sin(a) * rr).toFixed(2);
    }
    return d + 'Z';
  }
  function furnaceMarkup() {
    var body = 'M84 184C66 214 50 252 58 290C66 328 118 352 200 352C282 352 334 328 342 290C350 252 334 214 316 184Z';
    var meander = '';
    for (var i = 0; i <= 12; i++) {
      var t = 0.06 + i * (0.88 / 12);
      var bx = (1 - t) * (1 - t) * 40 + 2 * (1 - t) * t * 200 + t * t * 360;
      var by = (1 - t) * (1 - t) * 232 + 2 * (1 - t) * t * 262 + t * t * 232;
      var tx = 2 * (1 - t) * 160 + 2 * t * 160, ty = 2 * (1 - t) * 30 + 2 * t * -30;
      var ang = Math.atan2(ty, tx) * 180 / Math.PI;
      var sx = Math.max(0.25, Math.sqrt(Math.max(0, 1 - Math.pow((bx - 200) / 170, 2))));
      meander += '<path transform="translate(' + bx.toFixed(1) + ' ' + by.toFixed(1) + ') rotate(' + ang.toFixed(1) + ') scale(' + sx.toFixed(2) + ' 1)" d="M-7 4V-4H5V2H-1V-1"/>';
    }
    var embers = '';
    var ep = [[184, 410, 1.6], [206, 404, 1.3], [222, 414, 1.8], [192, 418, 1.2], [214, 420, 1.5], [176, 422, 1.1], [230, 408, 1.2]];
    for (var e = 0; e < ep.length; e++) embers += '<circle class="ember em' + (e + 1) + '" cx="' + ep[e][0] + '" cy="' + ep[e][1] + '" r="' + ep[e][2] + '"/>';
    var win = quatrefoil(200, 296, 27), winOuter = quatrefoil(200, 296, 32);
    return '<svg viewBox="0 0 400 460" aria-hidden="true" focusable="false">' +
      '<defs>' +
      '<radialGradient id="fz-halo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#d9b56c" stop-opacity=".32"/><stop offset=".45" stop-color="#d9b56c" stop-opacity=".08"/><stop offset="1" stop-color="#d9b56c" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="fz-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#202942"/><stop offset=".55" stop-color="#131a2e"/><stop offset="1" stop-color="#2b2519"/></linearGradient>' +
      '<linearGradient id="fz-side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset=".32" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#cdd6ee" stop-opacity=".06"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>' +
      '<radialGradient id="fz-under" cx="50%" cy="100%" r="62%"><stop offset="0" stop-color="#f2dfae" stop-opacity=".5"/><stop offset=".5" stop-color="#d9b56c" stop-opacity=".14"/><stop offset="1" stop-color="#d9b56c" stop-opacity="0"/></radialGradient>' +
      '<radialGradient id="fz-win" cx="50%" cy="62%" r="60%"><stop offset="0" stop-color="#fff8e4"/><stop offset=".3" stop-color="#f6e4b4"/><stop offset=".75" stop-color="#d9b56c"/><stop offset="1" stop-color="#8a6a32"/></radialGradient>' +
      '<linearGradient id="fz-fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#d9b56c" stop-opacity=".75"/><stop offset=".6" stop-color="#d9b56c" stop-opacity=".3"/><stop offset="1" stop-color="#d9b56c" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="fz-fm" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f6e2b0" stop-opacity=".95"/><stop offset=".55" stop-color="#f2dfae" stop-opacity=".55"/><stop offset="1" stop-color="#f2dfae" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="fz-fc" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#fff3d6" stop-opacity=".7"/><stop offset="1" stop-color="#fff3d6" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="fz-lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#26304c"/><stop offset="1" stop-color="#121829"/></linearGradient>' +
      '<clipPath id="fz-clip"><path d="' + body + '"/></clipPath>' +
      '</defs>' +
      '<ellipse class="fz-halo" cx="200" cy="330" rx="230" ry="190" fill="url(#fz-halo)"/>' +
      '<ellipse cx="200" cy="437" rx="160" ry="12" fill="#02040a" opacity=".75"/>' +
      '<path d="M188 340C190 370 189 398 186 426L214 426C211 398 210 370 212 340Z" fill="#0b101c"/>' +
      '<g class="fz-fire">' +
      '<ellipse cx="200" cy="431" rx="80" ry="7" fill="#f2dfae" opacity=".3"/>' +
      '<path class="fl fl1" d="M136 434C128 414 146 398 150 376C160 394 166 380 172 360C182 380 190 372 198 344C208 370 216 362 226 352C232 374 244 384 252 372C258 396 272 412 264 434Z" fill="url(#fz-fl)"/>' +
      '<path class="fl fl2" d="M158 434C152 418 166 402 170 386C178 398 184 388 190 370C198 388 206 380 214 366C220 386 232 396 238 388C244 408 248 422 242 434Z" fill="url(#fz-fm)"/>' +
      '<path class="fl fl3" d="M180 434C176 422 186 410 190 396C194 404 198 398 202 384C208 400 214 404 218 400C222 414 224 426 220 434Z" fill="url(#fz-fc)"/>' +
      '<path class="fl fl4" d="M146 436C140 428 146 418 150 408C154 418 158 426 154 436Z" fill="url(#fz-fm)"/>' +
      '<path class="fl fl5" d="M250 436C246 428 250 418 254 410C258 420 262 428 256 436Z" fill="url(#fz-fm)"/>' +
      '</g>' +
      '<path d="M112 326C104 356 94 388 86 418C84 424 78 428 70 431L104 433C108 410 116 380 134 338Z" fill="#0c111e" stroke="rgba(217,181,108,.32)" stroke-width="1"/>' +
      '<path d="M288 326C296 356 306 388 314 418C316 424 322 428 330 431L296 433C292 410 284 380 266 338Z" fill="#0c111e" stroke="rgba(217,181,108,.32)" stroke-width="1"/>' +
      '<path d="' + body + '" fill="url(#fz-body)"/>' +
      '<path d="' + body + '" fill="url(#fz-side)"/>' +
      '<path d="' + body + '" fill="url(#fz-under)"/>' +
      '<g clip-path="url(#fz-clip)" fill="none" stroke="rgba(217,181,108,.48)" stroke-width="1.1">' +
      '<path d="M30 218Q200 250 370 218"/><path d="M30 246Q200 278 370 246"/>' + meander +
      '<path d="M40 322Q200 358 360 322" stroke="rgba(217,181,108,.2)"/>' +
      '</g>' +
      '<path d="' + body + '" fill="none" stroke="rgba(217,181,108,.4)" stroke-width="1.2"/>' +
      '<path d="' + winOuter + '" fill="#0d1220" stroke="rgba(217,181,108,.55)" stroke-width="1.2"/>' +
      '<path class="fz-win" d="' + win + '" fill="url(#fz-win)"/>' +
      '<path d="' + win + '" fill="none" stroke="rgba(120,90,40,.6)" stroke-width="1"/>' +
      '<path d="M98 186C91 160 89 145 97 137C104 130 118 131 122 140C126 150 124 166 120 182" fill="none" stroke="#141a2c" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M98 186C91 160 89 145 97 137C104 130 118 131 122 140C126 150 124 166 120 182" fill="none" stroke="rgba(217,181,108,.45)" stroke-width="1.1"/>' +
      '<path d="M302 186C309 160 311 145 303 137C296 130 282 131 278 140C274 150 276 166 280 182" fill="none" stroke="#141a2c" stroke-width="9" stroke-linecap="round"/>' +
      '<path d="M302 186C309 160 311 145 303 137C296 130 282 131 278 140C274 150 276 166 280 182" fill="none" stroke="rgba(217,181,108,.45)" stroke-width="1.1"/>' +
      '<ellipse cx="200" cy="186" rx="124" ry="14" fill="#161d31" stroke="rgba(242,223,174,.5)" stroke-width="1.2"/>' +
      '<g class="fz-lid">' +
      '<path d="M94 184C106 148 148 126 200 124C252 126 294 148 306 184Z" fill="url(#fz-lid)" stroke="rgba(217,181,108,.4)" stroke-width="1.1"/>' +
      '<path d="M120 160Q200 178 280 160" fill="none" stroke="rgba(217,181,108,.3)" stroke-width="1"/>' +
      '<ellipse cx="160" cy="152" rx="7" ry="3.6" fill="#05070c"/><ellipse cx="200" cy="156" rx="7" ry="3.6" fill="#05070c"/><ellipse cx="240" cy="152" rx="7" ry="3.6" fill="#05070c"/>' +
      '<ellipse class="vent" cx="160" cy="152.6" rx="4.4" ry="1.6" fill="#d9b56c"/><ellipse class="vent" cx="200" cy="156.6" rx="4.4" ry="1.6" fill="#d9b56c"/><ellipse class="vent" cx="240" cy="152.6" rx="4.4" ry="1.6" fill="#d9b56c"/>' +
      '<ellipse cx="200" cy="125" rx="30" ry="6" fill="#1b2238" stroke="rgba(217,181,108,.45)" stroke-width="1"/>' +
      '<path d="M190 124C190 112 194 106 200 104C206 106 210 112 210 124Z" fill="#1b2238" stroke="rgba(217,181,108,.5)" stroke-width="1"/>' +
      '<circle cx="200" cy="99" r="6" fill="#20293f" stroke="rgba(242,223,174,.65)" stroke-width="1.1"/>' +
      '<circle cx="198" cy="97" r="1.6" fill="rgba(242,223,174,.8)"/>' +
      '</g>' +
      '<g class="fz-smoke" fill="none" stroke-linecap="round">' +
      '<path class="sm sm1" d="M200 90C188 70 212 54 200 34C190 18 206 4 198 -16" stroke="rgba(214,220,236,.3)" stroke-width="2.2"/>' +
      '<path class="sm sm2" d="M160 146C150 126 166 110 156 90C148 74 160 60 152 42" stroke="rgba(214,220,236,.22)" stroke-width="1.8"/>' +
      '<path class="sm sm3" d="M240 146C250 128 236 112 246 92C254 76 242 62 250 44" stroke="rgba(214,220,236,.22)" stroke-width="1.8"/>' +
      '</g>' +
      '<g class="fz-embers" fill="#f2dfae">' + embers + '</g>' +
      '</svg>';
  }
  var furnace = document.querySelector('.furnace');
  if (furnace) furnace.innerHTML = furnaceMarkup();

  /* ───────────── 符纸：符头（日、云盖、卦爻）与符脚（符胆螺旋） ───────────── */

  function spiral(cx, cy, turns, r0) {
    var d = '', N = 64;
    for (var i = 0; i <= N; i++) {
      var t = i / N, a = t * turns * TAU, rr = r0 * (1 - t * 0.86);
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr * 0.8).toFixed(1);
    }
    return d;
  }
  function talismanArt(idx, live) {
    var gua = [[1, 1, 1], [0, 1, 1], [1, 0, 1]][idx] || [1, 1, 1];
    var head = 'M60 16m-7 0a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M58 16h4' +
      'M22 42C26 32 36 30 42 37C46 29 54 28 60 35C66 28 74 29 78 37C84 30 94 32 98 42' +
      'M18 50H102 M36 50V60 M60 50V66 M84 50V60';
    var bars = '';
    for (var l = 0; l < 3; l++) {
      var y = 90 - l * 7;
      bars += gua[l] ? 'M47 ' + y + 'H73' : 'M47 ' + y + 'H57M63 ' + y + 'H73';
    }
    var foot = spiral(60, 20, 2.3, 14) + 'M26 46H94 M60 34V42 M40 52H80';
    return '<svg class="fu-art fu-head" viewBox="0 0 120 96" aria-hidden="true" focusable="false">' +
      '<path class="ink" d="' + head + '"/><path class="ink" stroke-width="3" d="' + bars + '"/>' +
      '<path class="charge" pathLength="1" d="' + head + '"/><path class="charge" pathLength="1" stroke-width="3" d="' + bars + '"/></svg>' +
      '<svg class="fu-art fu-foot" viewBox="0 0 120 60" aria-hidden="true" focusable="false">' +
      '<path class="ink" d="' + foot + '"/><path class="charge" pathLength="1" d="' + foot + '"/>' +
      (live ? '<rect class="stamp" x="88" y="6" width="14" height="14" rx="1.5" transform="rotate(-5 95 13)"/>' : '') +
      '</svg>';
  }
  var fus = document.querySelectorAll('.fu');
  Array.prototype.forEach.call(fus, function (fu, i) {
    var paper = fu.querySelector('.fu-paper');
    if (paper) paper.innerHTML = talismanArt(i, fu.classList.contains('fu-live'));
    // tilt towards the pointer; a tap lights the talisman on touch screens
    fu.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = fu.getBoundingClientRect();
      var qx = (e.clientX - r.left) / r.width - 0.5, qy = (e.clientY - r.top) / r.height - 0.5;
      fu.style.setProperty('--ry', (qx * 16).toFixed(2) + 'deg');
      fu.style.setProperty('--rx', (-qy * 10).toFixed(2) + 'deg');
    });
    fu.addEventListener('pointerleave', function () {
      fu.style.setProperty('--rx', '0deg');
      fu.style.setProperty('--ry', '0deg');
    });
    fu.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      fu.classList.add('is-lit');
      clearTimeout(fu._lit);
      fu._lit = setTimeout(function () { fu.classList.remove('is-lit'); }, 1800);
    }, { passive: true });
  });

  Array.prototype.forEach.call(document.querySelectorAll('.trials, .treasures'), function (list) {
    Array.prototype.forEach.call(list.children, function (el, i) { el.style.setProperty('--k', i); });
  });

  /* ───────────── in-page links: native smooth scroll (no scroll-jacking) ───────────── */

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var target = document.getElementById(a.getAttribute('href').slice(1));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: ANIM ? 'smooth' : 'auto', block: 'start' });
    if (history.pushState) history.pushState(null, '', '#' + target.id);
  });

  /* ───────────── scroll reveal, live sections, the last achievement ───────────── */

  var reveals = document.querySelectorAll('.reveal');
  var secs = document.querySelectorAll('.sec');
  var foot = document.querySelector('.site-foot');
  if ('IntersectionObserver' in window) {
    if (ANIM) {
      var rio = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            entries[i].target.classList.add('in');
            rio.unobserve(entries[i].target);
          }
        }
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.1 });
      for (var i = 0; i < reveals.length; i++) rio.observe(reveals[i]);
    } else {
      for (var j = 0; j < reveals.length; j++) reveals[j].classList.add('in');
    }
    // the furnace only burns while its section is on screen
    var lio = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) entries[i].target.classList.toggle('is-live', entries[i].isIntersecting);
    }, { threshold: 0 });
    for (var s = 0; s < secs.length; s++) lio.observe(secs[s]);
    if (foot) {
      var fio = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        fio.disconnect();
        say('成就', '阅尽洞府——道友好眼力', { kind: 'ach' });
      }, { threshold: 0.6 });
      fio.observe(foot);
    }
  } else {
    for (var m = 0; m < reveals.length; m++) reveals[m].classList.add('in');
    for (var n = 0; n < secs.length; n++) secs[n].classList.add('is-live');
  }
})();
