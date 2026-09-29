/* app.js — 화면 렌더링과 흐름. 판정·제출문 조립은 logic.js, 콘텐츠는 data.js.
 * 규칙: 함수 선언을 모두 끝낸 뒤 init()은 파일 맨 마지막에서만 호출한다(TDZ 방지).
 * 검증 상태를 다루는 조건문·라벨은 이 파일에 두지 않는다. */
"use strict";

const L = window.BungdangLogic;
const $ = (id) => document.getElementById(id);

const state = {
  sid: "",
  name: "",
  preview: false,
  idx: 0,               // 현재 분기(0~4)
  phase: "choose",      // "choose" | "result"
  orders: [],           // 분기별 선택지 표시 순서
  answers: [],          // 고른 결과 기록
  focusStage: null,     // 글쓰기에서 고른 분기 번호(1~5)
  texts: ["", ""],      // ① 내 선택과 이유 / ② 이어 쓰기
  hintOpen: [false, false],
  unlocked: false,      // ①을 최소 글자만큼 쓰면 true → 이어 쓸 방향 고르기가 열린다
  dir: null,            // ② 방향(WRITING.dirs의 인덱스), 아직 안 골랐으면 null
  saving: false,
  saved: false
};

/* ── 공통 도우미 ── */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// 본문의 {용어}를 용어 사전 버튼으로 바꾼다.
function withTerms(text) {
  return esc(text).replace(/\{([^}]+)\}/g, function (_, key) {
    return '<button type="button" class="term" data-term="' + key + '">' + key + "</button>";
  });
}

// 삽화 자리. 파일이 없으면 error 리스너(init)가 이 자리를 지운다.
function imgHtml(img) {
  if (!img || !img.src) return "";
  return '<figure class="scene-img"><img src="' + esc(img.src) + '" alt="' + esc(img.alt) + '" loading="lazy">' +
    "<figcaption>상상해서 그린 그림이야. 실제 기록이 아니야.</figcaption></figure>";
}

function onImgError(ev) {
  const el = ev.target;
  if (el && el.tagName === "IMG") {
    const fig = el.closest("figure");
    if (fig) fig.remove();
  }
}

function show(id, noScroll) {
  ["screenIntro", "screenSim", "screenSummary", "screenWriting"].forEach(function (s) {
    $(s).hidden = (s !== id);
  });
  if (!noScroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { t.hidden = true; }, 3200);
}

function setProgress(visible) {
  $("progress").hidden = !visible;
  if (!visible) return;
  const st = STAGES[state.idx];
  $("progressName").textContent = st.n + "단계 · " + st.name;
  $("progressCount").textContent = st.n + " / " + STAGES.length;
  $("progressFill").style.width = ((st.n / STAGES.length) * 100) + "%";
}

/* ── 시작 화면 ── */
function readParams() {
  const p = new URLSearchParams(location.search);
  state.preview = p.get("preview") === "1";
  let sid = (p.get("sid") || "").trim();
  let name = (p.get("name") || "").trim();
  if (state.preview) {
    if (!sid) sid = CONFIG.PREVIEW_SID;
    if (!name) name = CONFIG.PREVIEW_NAME;
  }
  $("sidInput").value = sid;
  $("nameInput").value = name;
  $("previewBanner").hidden = !state.preview;
}

function onLoginSubmit(ev) {
  ev.preventDefault();
  const sid = $("sidInput").value.trim();
  const name = $("nameInput").value.trim();
  const err = $("loginError");
  if (!L.isValidSid(sid)) { err.textContent = "학번은 숫자 5자리로 써 줘. (예: 30512)"; err.hidden = false; return; }
  if (!name) { err.textContent = "이름을 써 줘."; err.hidden = false; return; }
  err.hidden = true;
  state.sid = sid;
  state.name = name;
  startSimulation();
}

function resetRun() {
  state.idx = 0;
  state.phase = "choose";
  state.answers = [];
  state.focusStage = null;
  resetWriting();
  state.saving = false;
  state.saved = false;
  state.orders = L.displayOrders(STAGES.length);
}

function startSimulation() {
  resetRun();
  show("screenSim");
  renderStage();
}

/* ── 장면 ── */
function bridgeHtml(i) {
  const lines = BRIDGES[i - 1];
  if (!lines) return "";
  return '<div class="bridge"><p class="tag">그 뒤로…</p>' +
    lines.map(function (l) { return "<p>" + withTerms(l) + "</p>"; }).join("") + "</div>";
}

function renderStage() {
  const st = STAGES[state.idx];
  const order = state.orders[state.idx];
  const answered = state.phase === "result" ? state.answers[state.idx] : null;
  setProgress(true);

  $("bridgeSlot").innerHTML = (state.idx > 0 && state.phase === "choose") ? bridgeHtml(state.idx) : "";

  const choicesHtml = order.map(function (dataIdx, pos) {
    const c = st.choices[dataIdx];
    const picked = answered && answered.choiceId === c.id;
    const cls = "choice" + (picked ? " picked" : (answered ? " dim" : ""));
    return '<button type="button" class="' + cls + '" data-choice="' + dataIdx + '"' + (answered ? " disabled" : "") + ">" +
      '<span class="mark">' + (pos === 0 ? "A" : "B") + "</span>" +
      '<span><span class="c-text">' + esc(c.text) + "</span>" +
      '<span class="c-sub" style="display:block">' + esc(c.sub) + "</span></span></button>";
  }).join("");

  let afterHtml = "";
  if (answered) {
    const chosen = st.choices.filter(function (c) { return c.id === answered.choiceId; })[0];
    afterHtml = '<div class="after" id="afterCard"><h4>그때 실제로는?</h4>' +
      "<p>" + withTerms(st.result) + "</p>" +
      (st.resultNote ? '<p class="res-note">' + esc(st.resultNote) + "</p>" : "") +
      '<div class="stand">네가 고른 입장 · ' + esc(chosen.stand) + "</div>" +
      (!chosen.hard && st.softExtra ? '<div class="soft-note">' + esc(st.softExtra) + "</div>" : "") +
      '<div class="next-row"><button type="button" class="btn primary" id="nextBtn">' +
      (state.idx < STAGES.length - 1 ? "다음 장면 →" : "결과 보기 →") + "</button></div></div>";
  }

  $("stageCard").innerHTML =
    '<div class="stage-head"><span class="badge">' + st.n + "단계</span><span class=\"year\">" + esc(st.year) + "</span></div>" +
    imgHtml(st.img) +
    '<h3 class="stage-title">' + esc(st.title) + "</h3>" +
    '<p class="role">🎭 네 역할 · ' + esc(st.role) + "</p>" +
    '<div class="speaker ' + st.speaker.cls + '"><div class="avatar" aria-hidden="true">' + esc(st.speaker.avatar) + "</div>" +
    '<div><span class="speaker-name">' + esc(st.speaker.name) + '</span><span class="speaker-role">' + esc(st.speaker.role) + "</span>" +
    "<p>" + withTerms(st.scene) + "</p></div></div>" +
    '<div class="choices">' + choicesHtml + "</div>" +
    afterHtml +
    '<div class="tools"><button type="button" class="link-btn" id="magBtn">🔍 자료 돋보기: 당시 맥락 더 보기</button></div>';

  const card = $("stageCard");
  card.style.animation = "none";
  void card.offsetWidth;
  card.style.animation = "";
}

function pickChoice(dataIdx) {
  if (state.phase !== "choose") return;
  const st = STAGES[state.idx];
  const c = st.choices[dataIdx];
  if (!c) return;
  state.answers.push({
    stage: st.n, stageName: st.name, choiceId: c.id, hard: c.hard,
    choiceText: c.text, stand: c.stand
  });
  state.phase = "result";
  renderStage();
  const after = $("afterCard");
  if (after) after.scrollIntoView({ behavior: "smooth", block: "start" });
}

function goNext() {
  if (state.phase !== "result") return;
  if (state.idx < STAGES.length - 1) {
    state.idx += 1;
    state.phase = "choose";
    renderStage();
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    renderSummary();
  }
}

/* ── 자료 돋보기 · 용어 사전 ── */
function openMagnifier() {
  const m = STAGES[state.idx].magnifier;
  let html = "<h4 class=\"serif\">" + esc(m.title) + "</h4><p>" + esc(m.lead) + "</p>";
  if (m.list.length) html += '<ul class="mag-list">' + m.list.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + "</ul>";
  html += m.body.map(function (x) { return "<p>" + esc(x) + "</p>"; }).join("");
  $("magnifierBody").innerHTML = html;
  $("magnifierModal").hidden = false;
}

function openGlossary(focusKey) {
  $("glossaryBody").innerHTML = Object.keys(GLOSSARY).map(function (k) {
    return '<div class="g-item' + (k === focusKey ? " focus" : "") + '" data-key="' + esc(k) + '"><b>' + esc(k) + "</b><span>" + esc(GLOSSARY[k]) + "</span></div>";
  }).join("");
  $("glossaryModal").hidden = false;
  if (focusKey) {
    const el = $("glossaryBody").querySelector(".g-item.focus");
    if (el) el.scrollIntoView({ block: "center" });
  }
}

function closeModal(id) { $(id).hidden = true; }

/* ── 결과 ── */
function renderSummary() {
  setProgress(false);
  const n = L.countHard(state.answers);
  const t = L.classify(n);
  const soft = STAGES.length - n;

  const log = state.answers.map(function (a) {
    return '<div class="log-item"><span class="l-stage">' + a.stage + "번 · " + esc(a.stageName) + "</span><br>" +
      esc(a.choiceText) + '<br><span class="l-stand">네가 고른 입장 · ' + esc(a.stand) + "</span></div>";
  }).join("");

  $("screenSummary").innerHTML =
    '<div class="center"><span class="badge-soft">나의 성향 결과</span>' +
    '<h2 class="type-title">' + esc(t.name) + "</h2><p>" + esc(t.desc) + "</p></div>" +
    '<div class="gauge"><div class="gauge-row"><span>강경 ' + n + '</span><span>온건 ' + soft + "</span></div>" +
    '<div class="gauge-bar"><div class="gauge-hard" style="width:' + (n / STAGES.length * 100) + '%"></div>' +
    '<div class="gauge-soft" style="width:' + (soft / STAGES.length * 100) + '%"></div></div></div>' +
    '<h4 class="serif">내가 걸어온 다섯 번의 선택</h4><div class="log">' + log + "</div>" +
    '<p class="pattern">' + esc(L.patternLine(state.answers)) + "</p>" +
    '<p class="fun-note">이건 재미로 보는 성향 결과야. 옛 선비들이 이렇게 딱 나뉘었다는 뜻은 아니야.</p>' +
    '<div class="next-row"><button type="button" class="btn primary" id="toWritingBtn">다음: 가장 고민한 장면 글쓰기 →</button></div>';
  show("screenSummary");
}

/* ── 글쓰기 ── */
function focusAnswer() {
  return state.answers.filter(function (a) { return a.stage === state.focusStage; })[0] || null;
}

function chosenChoice() {
  const st = STAGES[state.focusStage - 1];
  const mine = focusAnswer();
  return st.choices.filter(function (c) { return mine && c.id === mine.choiceId; })[0] || null;
}

function otherChoice() {
  const st = STAGES[state.focusStage - 1];
  const mine = focusAnswer();
  return st.choices.filter(function (c) { return !mine || c.id !== mine.choiceId; })[0] || null;
}

function resetWriting() {
  state.texts = ["", ""];
  state.hintOpen = [false, false];
  state.unlocked = false;
  state.dir = null;
  state.saved = false;
}

function currentDir() { return state.dir === null ? null : WRITING.dirs[state.dir]; }

// 네가 한 선택 + 그때 실제로는(접이식. '실제 역사와 비교'를 고르면 펼쳐진다)
function myPickHtml() {
  const st = STAGES[state.focusStage - 1];
  const mine = focusAnswer();
  const c = chosenChoice();
  const d = currentDir();
  return '<div class="box"><h4>' + esc(st.name) + " · 네가 한 선택</h4>" +
    '<div class="side mine"><div class="s-stand">' + esc(c.stand) + "</div><div>" + esc(c.text) + "</div></div>" +
    '<details class="fact"' + (d && d.id === "fact" ? " open" : "") + '><summary>📌 그때 실제로는? (글의 근거로 써도 돼)</summary>' +
    "<p>" + withTerms(st.result) + "</p>" +
    (st.resultNote ? '<p class="res-note">' + esc(st.resultNote) + "</p>" : "") +
    (mine && !mine.hard && st.softExtra ? '<div class="soft-note">' + esc(st.softExtra) + "</div>" : "") +
    "</details></div>";
}

// 고르지 않은 쪽. 선택지에 적혀 있던 문장이고 실제 인물의 발언이 아니라는 점을 함께 밝힌다.
function otherSideHtml() {
  const o = otherChoice();
  return '<div class="box other"><h4>네가 고르지 않은 쪽</h4>' +
    '<div class="side"><div>' + esc(o.text) + '</div><div class="res-note">' + esc(o.sub) + "</div></div>" +
    '<p class="res-note">이쪽을 고른 사람이라면 이런 점을 내세울 수 있어. 선택지에 적혀 있던 내용이고, 실제 인물이 한 말은 아니야.</p></div>';
}

// 생각 사다리: 답이 아니라 질문만. 학생이 이미 본 선택지의 얻는 것/감수할 것만 다시 상기시킨다.
function hintHtml(i) {
  const d = currentDir();
  const steps = i === 0 ? WRITING.main.steps : d.steps;
  let remind = "";
  if (i === 0) {
    const c = chosenChoice();
    if (c) remind = '<p class="res-note">네가 고른 선택은 이런 거였어 · ' + esc(c.sub) + "</p>";
  } else if (d.id === "whatif") {
    const o = otherChoice();
    if (o) remind = '<p class="res-note">네가 안 고른 선택은 이런 거였어 · ' + esc(o.sub) + "</p>";
  }
  return "<p>이 질문에 하나씩 답하면서 써 봐. 다 쓰지 않아도 돼.</p><ol>" +
    steps.map(function (q) { return "<li>" + esc(q) + "</li>"; }).join("") + "</ol>" + remind;
}

function writeItemHtml(i) {
  const w = i === 0 ? WRITING.main : currentDir();
  return '<div class="write-item"><span class="field-label">' + esc(w.label) + "</span>" +
    (i === 0 ? '<p class="guide">' + esc(WRITING.main.intro) + "</p>" : "") +
    '<button type="button" class="hint-toggle" data-hint="' + i + '" aria-expanded="' + state.hintOpen[i] + '">💡 막막하면 힌트 보기</button>' +
    '<div class="hint-body" id="hint' + i + '"' + (state.hintOpen[i] ? "" : " hidden") + ">" + hintHtml(i) + "</div>" +
    '<textarea id="text' + i + '" data-text="' + i + '" placeholder="' + esc(w.placeholder) + '">' + esc(state.texts[i]) + "</textarea>" +
    '<div class="counter" id="count' + i + '"></div></div>';
}

function renderWriting(noScroll) {
  setProgress(false);
  const chips = state.answers.map(function (a) {
    return '<button type="button" class="pick" data-pick="' + a.stage + '" aria-pressed="' + (state.focusStage === a.stage) + '">' +
      a.stage + "번 " + esc(a.stageName) + "</button>";
  }).join("");

  let body = "";
  if (state.focusStage) {
    if (L.charCount(state.texts[0]) >= CONFIG.MIN_CHARS) state.unlocked = true;
    const dirChips = WRITING.dirs.map(function (d, i) {
      return '<button type="button" class="pick" data-dir="' + i + '" aria-pressed="' + (state.dir === i) + '">' + esc(d.chip) + "</button>";
    }).join("");
    const extra = state.dir === null ? "" :
      (currentDir().id === "other" ? otherSideHtml() : "") + writeItemHtml(1);
    body = myPickHtml() + writeItemHtml(0) +
      '<p class="lock-note" id="lockNote"' + (state.unlocked ? " hidden" : "") + ">①에 이유를 조금만 써 주면, 이어 쓸 이야기를 고를 수 있어.</p>" +
      '<div id="dirArea"' + (state.unlocked ? "" : " hidden") + '><p class="dir-q">' + esc(WRITING.dirsTitle) + '</p>' +
      '<div class="pick-chips">' + dirChips + '</div><div id="extraArea">' + extra + "</div></div>" +
      '<div class="actions"><button type="button" class="btn dark" id="copyBtn">📋 전체 제출문 복사하기</button>' +
      '<button type="button" class="btn primary" id="saveBtn">💾 기록 저장하기</button>' +
      '<button type="button" class="btn" id="restartBtn">처음부터 다시 하기</button></div>' +
      '<p class="status" id="status" role="status"></p>';
  }

  $("screenWriting").innerHTML =
    '<h2 class="serif" style="margin:0 0 4px">가장 고민한 장면을 하나 골라 줘</h2>' +
    '<div class="pick-chips">' + chips + "</div>" + body;
  show("screenWriting", noScroll);
  if (state.focusStage) { for (let i = 0; i < 2; i++) updateCounter(i); }
}

function onPick(n) {
  if (state.focusStage === n) return;
  const wrote = state.texts.some(function (t) { return t.trim().length > 0; });
  if (state.focusStage && wrote && !window.confirm("다른 장면을 고르면 쓴 글이 사라져. 계속할까?")) return;
  state.focusStage = n;
  resetWriting();
  renderWriting();
}

function onDir(i) {
  if (state.dir === i) return;
  if (state.dir !== null && state.texts[1].trim() && !window.confirm("이어 쓸 이야기를 바꾸면 ②에 쓴 글이 사라져. 계속할까?")) return;
  state.dir = i;
  state.texts[1] = "";
  state.hintOpen[1] = false;
  state.saved = false;
  renderWriting(true);
}

// ①을 최소 글자 수만큼 쓰면 이어 쓸 방향 고르기를 연다(다시 지워도 닫지 않는다).
function maybeUnlock() {
  if (state.unlocked || L.charCount(state.texts[0]) < CONFIG.MIN_CHARS) return;
  state.unlocked = true;
  const area = $("dirArea");
  const note = $("lockNote");
  if (area) area.hidden = false;
  if (note) note.hidden = true;
  toast("좋아! 이어 쓸 이야기를 고를 수 있어. 아래로 내려가 봐.");
}

function updateCounter(i) {
  const c = L.charCount(state.texts[i]);
  const el = $("count" + i);
  if (!el) return;
  const ok = c >= CONFIG.MIN_CHARS;
  el.textContent = ok ? "좋아, 충분해! (" + c + "자)" : c + " / " + CONFIG.MIN_CHARS + "자 · 한두 문장이면 돼";
  el.className = "counter" + (ok ? " ok" : "");
}

function setStatus(msg, kind) {
  const el = $("status");
  if (!el) return;
  el.textContent = msg;
  el.className = "status" + (kind ? " " + kind : "");
}

function requireReady() {
  const min = CONFIG.MIN_CHARS;
  if (L.charCount(state.texts[0]) < min) {
    setStatus("①에 이유를 한두 문장만 써 줘. (" + L.charCount(state.texts[0]) + " / " + min + "자)", "bad");
    const ta = $("text0"); if (ta) ta.focus();
    return false;
  }
  if (state.dir === null) {
    setStatus("이어 쓸 이야기를 하나 골라 줘.", "bad");
    return false;
  }
  if (L.charCount(state.texts[1]) < min) {
    setStatus("②도 한두 문장만 써 줘. (" + L.charCount(state.texts[1]) + " / " + min + "자)", "bad");
    const ta = $("text1"); if (ta) ta.focus();
    return false;
  }
  return true;
}

function currentReflection() {
  const mine = focusAnswer();
  const d = currentDir();
  return L.buildReflection(mine ? mine.stageName : "", [WRITING.main.label, d ? d.label : ""], state.texts, mine ? mine.choiceText : "");
}

function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise(function (resolve, reject) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    ok ? resolve() : reject(new Error("copy failed"));
  });
}

function onCopy() {
  if (!requireReady()) return;
  const text = L.buildCopyText({ sid: state.sid, name: state.name, answers: state.answers, reflection: currentReflection() });
  copyText(text).then(function () {
    setStatus("복사됐어! 우리 반 Padlet에 붙여 넣어 줘.", "ok");
    toast("제출문을 복사했어.");
  }).catch(function () {
    setStatus("복사하지 못했어. 글을 직접 선택해서 복사해 줘.", "bad");
  });
}

async function onSave() {
  if (state.saving) return;
  if (!requireReady()) return;
  if (state.preview) {
    setStatus("미리보기 모드라 저장하지 않았어.", "");
    toast("미리보기 모드에서는 저장되지 않아.");
    return;
  }
  const mine = focusAnswer();
  const payload = L.buildPayload({
    sid: state.sid, name: state.name, gameName: CONFIG.GAME_NAME,
    answers: state.answers, focusName: mine.stageName, focusStage: state.focusStage, dirId: currentDir().id,
    reflection: currentReflection()
  });
  const btn = $("saveBtn");
  state.saving = true;
  btn.disabled = true;
  btn.textContent = "저장하는 중…";
  try {
    const res = await fetch(CONFIG.SHEET_WEBAPP_URL, { method: "POST", body: JSON.stringify(payload) });
    const body = await res.json().catch(function () { return null; });
    if (!body || body.result === "error") throw new Error((body && body.message) || "저장 실패");
    state.saved = true;
    btn.textContent = "저장 완료 ✓";
    setStatus("저장했어! Padlet 제출도 잊지 마.", "ok");
  } catch (e) {
    btn.disabled = false;
    btn.textContent = "💾 기록 저장하기";
    setStatus("저장하지 못했어. 인터넷을 확인하고 다시 눌러 줘. 쓴 글은 그대로 남아 있어.", "bad");
  } finally {
    state.saving = false;
  }
}

function onRestart() {
  const wrote = state.texts.some(function (t) { return t.trim().length > 0; });
  if (wrote && !window.confirm("처음부터 다시 하면 쓴 글이 사라져. 계속할까?")) return;
  resetRun();
  $("progress").hidden = true;
  show("screenIntro");
}

function onTextInput(i, value) {
  state.texts[i] = value;
  updateCounter(i);
  if (i === 0) maybeUnlock();
  if (state.saved) {
    state.saved = false;
    const btn = $("saveBtn");
    if (btn) { btn.disabled = false; btn.textContent = "💾 기록 저장하기"; }
    setStatus("내용을 고쳤어. 다시 저장할 수 있어.", "");
  }
}

/* ── 이벤트 위임 ── */
function onClick(ev) {
  const t = ev.target.closest("button, .modal");
  if (!t) return;
  if (t.classList.contains("modal")) { if (ev.target === t) t.hidden = true; return; }
  if (t.dataset.term) return openGlossary(t.dataset.term);
  if (t.dataset.close) return closeModal(t.dataset.close);
  if (t.dataset.choice !== undefined) return pickChoice(Number(t.dataset.choice));
  if (t.dataset.pick) return onPick(Number(t.dataset.pick));
  if (t.dataset.dir !== undefined) return onDir(Number(t.dataset.dir));
  if (t.dataset.hint !== undefined) {
    const i = Number(t.dataset.hint);
    state.hintOpen[i] = !state.hintOpen[i];
    $("hint" + i).hidden = !state.hintOpen[i];
    t.setAttribute("aria-expanded", String(state.hintOpen[i]));
    return;
  }
  switch (t.id) {
    case "glossaryBtn": return openGlossary();
    case "magBtn": return openMagnifier();
    case "nextBtn": return goNext();
    case "toWritingBtn": return renderWriting();
    case "copyBtn": return onCopy();
    case "saveBtn": return onSave();
    case "restartBtn": return onRestart();
  }
}

function onInput(ev) {
  const el = ev.target;
  if (el.dataset && el.dataset.text !== undefined) onTextInput(Number(el.dataset.text), el.value);
}

function onKey(ev) {
  if (ev.key !== "Escape") return;
  closeModal("glossaryModal");
  closeModal("magnifierModal");
}

function init() {
  readParams();
  $("introImg").innerHTML = imgHtml(INTRO_IMG);
  document.addEventListener("error", onImgError, true);   // 삽화 파일이 없으면 자리를 지운다
  $("loginForm").addEventListener("submit", onLoginSubmit);
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKey);
  show("screenIntro");
}

// ⚠️ 반드시 파일 맨 마지막. 위의 모든 선언이 끝난 뒤에만 실행한다.
init();
