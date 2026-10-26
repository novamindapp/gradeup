/* GradeUp — shared calculator logic.
   Null-safe by design (Toolvexa lesson): blanks are treated as 0 or
   ignored, never as NaN, and no page crashes if an element is missing.
   Pure math lives on GradeUp so it can be unit-checked with node. */
(function (global) {
  'use strict';

  /* Standard US 4.0 scale used across all tools. */
  var POINTS = {
    'A+': 4.0, 'A': 4.0, 'A-': 3.7,
    'B+': 3.3, 'B': 3.0, 'B-': 2.7,
    'C+': 2.3, 'C': 2.0, 'C-': 1.7,
    'D+': 1.3, 'D': 1.0, 'F': 0.0
  };

  function num(v) {
    var n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }

  function round(n, places) {
    var p = Math.pow(10, places || 2);
    return Math.round(n * p) / p;
  }

  /* Required final-exam score (%).
     current: current grade %, weightPct: final weight %, target: target %. */
  function requiredFinal(current, weightPct, target) {
    var w = num(weightPct) / 100;
    if (!w || w <= 0 || w > 1) return null;
    return (num(target) - num(current) * (1 - w)) / w;
  }

  /* Weighted GPA from rows: [{points, credits}]. Rows with 0 credits ignored. */
  function weightedGPA(rows) {
    var pts = 0, cr = 0, i, c;
    for (i = 0; i < rows.length; i++) {
      c = num(rows[i].credits);
      if (c > 0) { pts += num(rows[i].points) * c; cr += c; }
    }
    return cr > 0 ? pts / cr : null;
  }

  /* New cumulative GPA. newRows: [{points, credits}] (standard 4.0 points). */
  function cumulativeGPA(curGPA, curCredits, newRows) {
    var pts = num(curGPA) * num(curCredits), cr = num(curCredits), i, c;
    for (i = 0; i < newRows.length; i++) {
      c = num(newRows[i].credits);
      if (c > 0) { pts += num(newRows[i].points) * c; cr += c; }
    }
    return cr > 0 ? pts / cr : null;
  }

  /* GPA needed next semester. Returns null when planned credits are 0. */
  function neededNext(curGPA, curCredits, target, planned) {
    var pc = num(planned);
    if (pc <= 0) return null;
    return (num(target) * (num(curCredits) + pc) - num(curGPA) * num(curCredits)) / pc;
  }

  /* Highest GPA reachable next semester if every new grade is a 4.0. */
  function maxReachable(curGPA, curCredits, planned) {
    var pc = num(planned), cc = num(curCredits);
    if (pc <= 0) return null;
    return (num(curGPA) * cc + 4.0 * pc) / (cc + pc);
  }

  var GradeUp = {
    POINTS: POINTS,
    num: num,
    round: round,
    requiredFinal: requiredFinal,
    weightedGPA: weightedGPA,
    cumulativeGPA: cumulativeGPA,
    neededNext: neededNext,
    maxReachable: maxReachable
  };
  global.GradeUp = GradeUp;
  if (typeof module !== 'undefined' && module.exports) module.exports = GradeUp;

  /* ---- Browser wiring below. Skipped entirely under node. ---- */
  if (typeof document === 'undefined') return;

  function $(id) { return document.getElementById(id); }
  function setHTML(id, html) { var el = $(id); if (el) el.innerHTML = html; }
  function on(id, evt, fn) { var el = $(id); if (el) el.addEventListener(evt, fn); }

  function gradeOptions(selected) {
    var html = '', g;
    for (g in POINTS) {
      if (Object.prototype.hasOwnProperty.call(POINTS, g)) {
        html += '<option value="' + g + '"' + (g === selected ? ' selected' : '') + '>' + g + '</option>';
      }
    }
    return html;
  }

  function levelOptions(selected) {
    var levels = [['regular', 'Regular'], ['honors', 'Honors (+0.5)'], ['ap', 'AP / IB (+1.0)']];
    var html = '', i;
    for (i = 0; i < levels.length; i++) {
      html += '<option value="' + levels[i][0] + '"' + (levels[i][0] === selected ? ' selected' : '') + '>' + levels[i][1] + '</option>';
    }
    return html;
  }

  function levelBonus(level) {
    if (level === 'honors') return 0.5;
    if (level === 'ap') return 1.0;
    return 0;
  }

  /* ---------- Tool 1: Final grade calculator ---------- */
  function calcFinal() {
    var cur = $('current-grade'), w = $('final-weight'), t = $('target-grade');
    if (!cur || !w || !t) return;
    var weight = num(w.value);
    if (weight <= 0 || weight > 100) {
      setHTML('final-result', '<span class="warn">Enter a final exam weight between 1 and 100.</span>');
      setHTML('whatif-body', '');
      return;
    }
    var req = requiredFinal(cur.value, weight, t.value);
    if (req === null) {
      setHTML('final-result', '<span class="warn">Check your numbers and try again.</span>');
      return;
    }
    var msg;
    if (req > 100) msg = 'You need <span class="big">' + round(req, 1) + '%</span> on the final — over 100%, so this target is not reachable from here. Aim for the next target down, or raise your current grade first.';
    else if (req < 0) msg = 'You need <span class="big">0%</span> — this target is already secured even with a 0 on the final.';
    else msg = 'You need <span class="big">' + round(req, 1) + '%</span> on the final to finish with ' + num(t.value) + '%.';
    setHTML('final-result', msg);
    var letters = [['A', 90], ['B', 80], ['C', 70], ['D', 60]], html = '', i, r, cell;
    for (i = 0; i < letters.length; i++) {
      r = requiredFinal(cur.value, weight, letters[i][1]);
      if (r === null) cell = '—';
      else if (r > 100) cell = 'Not possible (over 100%)';
      else if (r < 0) cell = 'Already secured';
      else cell = round(r, 1) + '%';
      html += '<tr><td>' + letters[i][0] + ' (' + letters[i][1] + '%)</td><td>' + cell + '</td></tr>';
    }
    setHTML('whatif-body', html);
  }
  if ($('current-grade')) {
    on('current-grade', 'input', calcFinal);
    on('final-weight', 'input', calcFinal);
    on('target-grade', 'input', calcFinal);
    on('calc-final', 'click', calcFinal);
    calcFinal();
  }

  /* ---------- Shared course-row helpers ---------- */
  function collectRows(tbodyId, withLevel) {
    var tbody = $(tbodyId), rows = [], i, tr, grade, credits, level;
    if (!tbody) return rows;
    for (i = 0; i < tbody.rows.length; i++) {
      tr = tbody.rows[i];
      grade = tr.querySelector('.grade');
      credits = tr.querySelector('.credits');
      level = withLevel ? tr.querySelector('.level') : null;
      if (!grade || !credits) continue;
      rows.push({
        points: POINTS[grade.value] + (withLevel ? levelBonus(level ? level.value : 'regular') : 0),
        credits: credits.value
      });
    }
    return rows;
  }

  function addCourseRow(tbodyId, withLevel) {
    var tbody = $(tbodyId);
    if (!tbody) return;
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td><input type="text" class="course" placeholder="Course (optional)" aria-label="Course name"></td>' +
      '<td><select class="grade" aria-label="Letter grade">' + gradeOptions('A') + '</select></td>' +
      (withLevel ? '<td><select class="level" aria-label="Course level">' + levelOptions('regular') + '</select></td>' : '') +
      '<td><input type="number" class="credits" min="0" step="0.5" placeholder="3" aria-label="Credits"></td>' +
      '<td class="row-actions"><button type="button" class="small secondary remove-row" aria-label="Remove course">Remove</button></td>';
    tbody.appendChild(tr);
  }

  function wireCourseTable(tbodyId, addBtnId, computeFn) {
    var tbody = $(tbodyId);
    if (!tbody) return;
    tbody.addEventListener('input', computeFn);
    tbody.addEventListener('change', computeFn);
    tbody.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('.remove-row') : null;
      if (btn && tbody.rows.length > 1) { btn.closest('tr').remove(); computeFn(); }
    });
    on(addBtnId, 'click', function () { addCourseRow(tbodyId, tbodyId === 'gpa-rows'); computeFn(); });
  }

  /* ---------- Tool 2: Weighted GPA ---------- */
  function calcWeighted() {
    var rows = collectRows('gpa-rows', true);
    var gpa = weightedGPA(rows);
    if (gpa === null) setHTML('weighted-result', '<span class="muted">Add at least one course with credits above 0.</span>');
    else setHTML('weighted-result', 'Your weighted GPA is <span class="big">' + round(gpa, 2) + '</span>');
  }
  if ($('gpa-rows')) {
    addCourseRow('gpa-rows', true);
    addCourseRow('gpa-rows', true);
    addCourseRow('gpa-rows', true);
    wireCourseTable('gpa-rows', 'add-course', calcWeighted);
    calcWeighted();
  }

  /* ---------- Tool 3: Cumulative GPA ---------- */
  function calcCumulative() {
    var gpaEl = $('cur-gpa'), crEl = $('cur-credits');
    if (!gpaEl || !crEl) return;
    var gpa = cumulativeGPA(gpaEl.value, crEl.value, collectRows('cum-rows', false));
    if (gpa === null) setHTML('cum-result', '<span class="muted">Enter your current GPA and completed credits, plus at least one new course with credits.</span>');
    else setHTML('cum-result', 'Your new cumulative GPA will be <span class="big">' + round(gpa, 2) + '</span>');
  }
  if ($('cum-rows')) {
    addCourseRow('cum-rows', false);
    addCourseRow('cum-rows', false);
    wireCourseTable('cum-rows', 'add-cum-course', calcCumulative);
    on('cur-gpa', 'input', calcCumulative);
    on('cur-credits', 'input', calcCumulative);
    on('calc-cum', 'click', calcCumulative);
    calcCumulative();
  }

  /* ---------- Tool 4: GPA goal solver ---------- */
  function calcGoal() {
    var g = $('goal-cur-gpa'), c = $('goal-cur-credits'), t = $('goal-target'), p = $('goal-planned');
    if (!g || !c || !t || !p) return;
    if (num(p.value) <= 0) {
      setHTML('goal-result', '<span class="muted">Enter how many credits you plan to take next semester.</span>');
      return;
    }
    var need = neededNext(g.value, c.value, t.value, p.value);
    var max = maxReachable(g.value, c.value, p.value);
    var html;
    if (need === null) html = '<span class="warn">Check your numbers and try again.</span>';
    else if (need > 4.0) html = 'You would need <span class="big">' + round(need, 2) + '</span> next semester — above a 4.0, so this target is not reachable. Even with straight As, the highest you can reach is <span class="big">' + round(max, 2) + '</span>.';
    else if (need < 0) html = 'You are already above your target — even with a 0.0 next semester you stay above ' + num(t.value) + '.';
    else html = 'You need a <span class="big">' + round(need, 2) + '</span> GPA next semester to reach ' + num(t.value) + '.';
    setHTML('goal-result', html);
  }
  if ($('goal-cur-gpa')) {
    on('goal-cur-gpa', 'input', calcGoal);
    on('goal-cur-credits', 'input', calcGoal);
    on('goal-target', 'input', calcGoal);
    on('goal-planned', 'input', calcGoal);
    on('calc-goal', 'click', calcGoal);
    calcGoal();
  }
})(typeof window !== 'undefined' ? window : this);
