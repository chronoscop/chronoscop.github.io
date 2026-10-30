/* 时镜散人 · 洞府 — games.js
 * 试炼场：问心局。三道两难，每答一次，执棋人追问一次；最后不论对错，只看道心是否前后如一。
 * 经典脚本，不依赖 main.js；结局通过 main.js 暴露的 window.dongfuSay 弹出系统提示（若存在）。
 */
(function () {
  'use strict';

  var stage = document.getElementById('wx-stage'), btn = document.getElementById('wx-start');
  if (!stage || !btn) return;
  function toast(tag, text) { if (window.dongfuSay) window.dongfuSay(tag, text); }

  // 每一问：[题面, [[选项, 立场, 追问, 坚持, 动摇], …]]；立场 理 = 守规矩与公道，情 = 守人心与恩情
  var ROUNDS = [
    ['城中有令：入夜闭门，擅开者与入城者同罪。门外一个孩子拍着门求你开门，守卫看着你。', [
      ['开门', '情', '你开了这扇门。明夜门外站着一百个孩子，你开不开？守卫因你受罚，他家的孩子又由谁来开门？', '照开。规矩错了，就该改', '那……只开这一次'],
      ['不开', '理', '孩子冻死在门外。规矩是人定的，你守的究竟是规矩，还是你自己的心安？', '守。规矩不为一人而破', '我……去求守卫通融']
    ]],
    ['恩师当年救过你的命。如今你亲眼看见，他为了续命，害了一村的人。', [
      ['揭发他', '理', '他救你的时候，可曾问过你值不值得救？你今日这条命，是他给的。', '仍要揭发。恩是恩，罪是罪', '我……替他瞒下这一次'],
      ['替他瞒下', '情', '一村人的命，换你一个人的恩情。这笔账，你算过吗？', '算过。这份恩，我认', '那我替他去赎罪……']
    ]],
    ['修行到了尽头。有人告诉你：只要斩断心中最后一念，便可登天。那一念，是你最在意的人。', [
      ['斩', '理', '登天之后，世上再无一人记得你是谁。你登的，是谁的天？', '我自己的天', '我……再想想'],
      ['不斩', '情', '这一念拖住你，百年之后，你和那人一同化作黄土。值吗？', '值', '若能两全……']
    ]]
  ];

  /* kai:start — rendered in the kai face; tools/subset_fonts.py reads this block */
  var ENDS = [
    ['道心崩碎', '问一句，退一步。下回入局之前，先想清楚自己信什么。'],
    ['道心动摇', '你心里有答案，只是被人一逼，就不敢认了。'],
    ['道心有隙', '大体站得住，被逼急时退了一步。那一步，就是你的心魔。'],
    ['道心如镜', '每一问都站得住，可三问之间各说各话。你守的，是当下这一念。'],
    ['道心通明', '']
  ];
  var CLEAR = {
    理: '前后如一，问不倒你。你守的是规矩——记住，规矩背后也是人。',
    情: '前后如一，问不倒你。你守的是人心——记住，人心也会骗人。'
  };
  /* kai:end */

  var holds, sides, recap;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function choices(list, onPick) {
    var box = el('div', 'wx-opts');
    list.forEach(function (label, k) {
      var b = el('button', 'wx-opt', label);
      b.type = 'button';
      b.addEventListener('click', function () { onPick(k); });
      box.appendChild(b);
    });
    stage.appendChild(box);
    box.firstChild.focus({ preventScroll: true });
  }

  function ask(n) {
    var r = ROUNDS[n];
    stage.innerHTML = '';
    stage.appendChild(el('p', 'wx-count', '第 ' + (n + 1) + ' / ' + ROUNDS.length + ' 问'));
    stage.appendChild(el('p', 'wx-q', r[0]));
    choices(r[1].map(function (o) { return o[0]; }), function (k) { press(n, r[1][k]); });
  }

  function press(n, o) {
    stage.innerHTML = '';
    stage.appendChild(el('p', 'wx-count', '第 ' + (n + 1) + ' / ' + ROUNDS.length + ' 问 · 你答：' + o[0]));
    stage.appendChild(el('p', 'wx-who', '执棋人'));
    stage.appendChild(el('p', 'wx-voice', o[2]));
    choices([o[3], o[4]], function (k) {
      var held = k === 0;
      if (held) holds++;
      sides.push(o[1]);
      recap.push(o[0] + ' · ' + (held ? o[3] : o[4]));
      if (n + 1 < ROUNDS.length) ask(n + 1); else reveal();
    });
  }

  function reveal() {
    var same = sides.every(function (s) { return s === sides[0]; });
    var end = holds === 3 ? (same ? ENDS[4] : ENDS[3]) : ENDS[holds];
    var word = end[0] === '道心通明' ? CLEAR[sides[0]] : end[1];
    stage.innerHTML = '';
    stage.appendChild(el('p', 'wx-count', '问心已毕'));
    stage.appendChild(el('p', 'wx-end', end[0]));
    stage.appendChild(el('p', 'wx-verse', word));
    var ul = el('ul', 'wx-recap');
    recap.forEach(function (line) { ul.appendChild(el('li', '', line)); });
    stage.appendChild(ul);
    btn.textContent = '再入一局';
    btn.hidden = false;                // the button only comes back once the round is over
    toast('问心', '问心已毕：' + end[0]);
  }

  btn.addEventListener('click', function () { btn.hidden = true; holds = 0; sides = []; recap = []; ask(0); });
})();
