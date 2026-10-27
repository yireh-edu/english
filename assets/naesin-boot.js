/*
 * 이레 영어 · 공교육 연계 (→ en-site/assets/naesin-boot.js, quiz.js 보다 먼저 실행)
 *   1) 학기 진도 맞추기: 1학기(3~8월)에는 학년 문제 중 1학기 것만, 2학기(9~2월)에는 1·2학기 모두 (sem 표시가 없는 표현·문장은 늘 들어감)
 *   2) 내신 범위: 선생님 파일 naesin.js 의 window.NAESIN.exams → 시험마다 단계 하나 (단어·표현·문장으로 오늘의 10문제)
 *      시험이 끝나고 4일째부터는 목록에서 빠짐
 *   4) 교육과정 성취기준 (window.EN_STANDARDS, 2022 개정 영어과): 단계마다 접어 둔 목록. 초1·2는 학교 영어 전 단계라는 안내
 *   3) 날마다 안내: 내신 단계는 시험 D-day, 시험 2주 전부터는 "오답노트부터 복습". 일반 단계는 학교 시험 기간 무렵 복습 안내
 */
(function () {
  var C = window.QUIZ_CONFIG, D = window.QUIZ_DATA || {};
  var T = window.QUIZ_TRACKS = window.QUIZ_TRACKS || {};
  var today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  var utc = function (d) { return Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)); };
  var daysTo = function (d) { return Math.round((utc(d) - utc(today)) / 864e5); };
  var month = +today.slice(5, 7), md = month * 100 + +today.slice(8, 10);
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // ── 1) 학기 진도 ──
  var sem1 = month >= 3 && month <= 8;
  if (sem1) Object.keys(D).forEach(function (k) { if (Array.isArray(D[k])) D[k] = D[k].filter(function (it) { return it.sem !== 's2'; }); });

  // ── 2) 내신 범위 ──
  var exams = ((window.NAESIN && window.NAESIN.exams) || []).filter(function (e) { return e && e.id && !(e.date && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && daysTo(e.date) < -3); });
  var info = {};
  exams.forEach(function (e) {
    var id = 'ns-' + String(e.id).replace(/[^0-9A-Za-z가-힣_-]/g, '_');
    var items = [], seen = {};
    (e.words || []).forEach(function (w) {
      var a = Array.isArray(w) ? { w: w[0], m: w[1] } : (w || {});
      if (!a.w || !a.m) return;
      var word = String(a.w).trim(), key = word.toLowerCase();
      if (seen[key]) return; seen[key] = 1;
      // 띄어쓰기가 있으면 숙어·표현, 없으면 단어 (뜻 고르기·듣고 고르기·철자 쓰기)
      items.push(/\s/.test(word) ? { t: 'expr', w: word, m: String(a.m).trim() } : { t: 'word', w: word, m: String(a.m).trim(), p: a.p });
    });
    (e.sents || []).forEach(function (x) {
      var a = Array.isArray(x) ? { s: x[0], ko: x[1] } : (x || {});
      if (a.s && a.ko) items.push({ t: 'sent', s: String(a.s).trim(), ko: String(a.ko).trim() });
    });
    if (items.length < 5) return;   // 너무 적으면 문제를 못 만듦
    D[id] = items;
    T[id] = [e.school, e.grade, e.title].filter(Boolean).join(' ') || '내신 범위';
    C.trackOrder = (C.trackOrder || []).concat(id);
    var gr = String(e.grade || ''), band = /^초[34]/.test(gr) ? 'e34' : /^초[56]/.test(gr) ? 'e56' : /^중/.test(gr) ? 'mid' : /^고/.test(gr) ? 'high' : '';
    info[id] = { band: band, date: /^\d{4}-\d{2}-\d{2}$/.test(e.date || '') ? e.date : '', book: e.book || '', range: e.range || '' };
  });

  // ── 3) 날마다 안내 (quiz.js 가 '오늘의 퀴즈' 위에 넣음) ──
  // 학교 시험 기간 무렵 (대부분 학교의 중간·기말고사 2주 전쯤부터): 4/15~5/5, 6/20~7/10, 9/25~10/15, 11/25~12/15
  var season = (md >= 415 && md <= 505) || (md >= 620 && md <= 710) || (md >= 925 && md <= 1015) || (md >= 1125 && md <= 1215);
  // 성취기준 목록 (접어 둠)
  var STD = window.EN_STANDARDS || [], BAND_NAME = { e34: '초3·4', e56: '초5·6', mid: '중1~3', high: '고등 공통영어1·2' };
  var stdHTML = function (band) {
    if (band === 'e12') return '<p class="note std">초1·2는 학교 영어 수업 전 단계예요. 학교 영어는 3학년부터 시작해요 (2022 개정 교육과정).</p>';
    var list = STD.filter(function (x) { return x[1] === band; });
    if (!list.length) return '';
    return '<details class="std"><summary>교육과정 성취기준 · ' + BAND_NAME[band] + ' ' + list.length + '개</summary>' + ['이해', '표현'].map(function (a) {
      return '<p class="std-a">' + a + (a === '이해' ? ' (듣기·읽기)' : ' (말하기·쓰기)') + '</p><ul>' + list.filter(function (x) { return x[2] === a; }).map(function (x) { return '<li><b>' + esc(x[0]) + '</b> ' + esc(x[3]) + '</li>'; }).join('') + '</ul>';
    }).join('') + '<p class="std-src">교육부 고시 제2022-33호 [별책 14] 영어과 교육과정</p></details>';
  };
  C.dayNote = function (track, wrongN, knownN, totalN) {
    var x = info[track];
    var review = wrongN ? ' <button class="btn ghost small" type="button" data-tab="wrong">오답노트 ' + wrongN + '문제 복습</button>' : '';
    if (x) {
      var d = x.date ? daysTo(x.date) : null;
      var dd = d == null ? '' : d > 0 ? 'D-' + d : d === 0 ? '오늘 시험' : '시험 끝';
      var range = [x.book, x.range].filter(Boolean).map(esc).join(' · ');
      return stdHTML(x.band) + '<p class="note naesin">' + (dd ? '<span class="badge' + (d != null && d <= 14 && d >= 0 ? ' late' : '') + '">' + dd + '</span> ' : '') + '<b>내신 범위</b>' + (range ? ' ' + range : '') +
        (d != null && d >= 0 && d <= 14 ? '<br>시험 2주 전이에요. 오늘의 문제와 함께 틀린 문제부터 다시 봐요.' + review : '') + '</p>';
    }
    // 교육과정 기본 어휘 단계: 익힌 단어 수 (한 번이라도 맞힌 단어)
    if (/^bv-/.test(track)) {
      var pct = totalN ? Math.round(100 * (knownN || 0) / totalN) : 0;
      return '<p class="note bv"><b>교육과정 기본 어휘</b> ' + (track === 'bv-elem' ? '초등 권장 800단어 (*)' : '중학교·고등 공통영어 권장 1,200단어 (**)') +
        '<br>익힌 단어 <b>' + (knownN || 0) + ' / ' + totalN + '</b> (' + pct + '%)<span class="bv-bar"><span style="width:' + pct + '%"></span></span>' +
        '<span class="std-src">교육부 고시 제2022-33호 [별책 14] [별표 3] 어휘</span>' + (wrongN ? '<br>' + review : '') + '</p>';
    }
    return stdHTML(track) + '<p class="note sem">' + (sem1 ? '1학기' : '1·2학기') + ' 진도 범위에서 나와요.' + (season ? ' 학교 시험 기간 무렵이에요. 틀린 문제부터 복습해요.' + review : '') + '</p>';
  };
  window.NAESIN_DEBUG = { info: info, sem1: sem1, season: season };
})();
