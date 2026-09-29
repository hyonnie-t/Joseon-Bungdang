// 판정·표시 순서·제출문 단위 테스트. 실행: node tests/logic.test.mjs
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const L = require("../logic.js");
const { STAGES, BRIDGES, GLOSSARY, WRITING } = require("../data.js");

let passed = 0;
function t(name, fn) { fn(); passed++; console.log("ok  " + name); }

function answersWith(hardFlags) {
  return hardFlags.map((h, i) => ({
    stage: i + 1, stageName: STAGES[i].name, choiceId: STAGES[i].id + (h ? "-hard" : "-soft"),
    hard: h, choiceText: "선택문", stand: "자리"
  }));
}

t("hard 0~5 각각 유형명이 일치한다", () => {
  const expected = ["차근차근 안정 수호가형", "손잡고 가는 포용가형", "균형 잡는 조율가형",
    "타이밍 재는 전략가형", "밀어붙이는 승부사형", "끝장 승부 개혁가형"];
  for (let n = 0; n <= 5; n++) {
    const flags = [0, 1, 2, 3, 4].map((i) => i < n);
    assert.equal(L.countHard(answersWith(flags)), n);
    assert.equal(L.classify(n).name, expected[n]);
  }
});

t("범위 밖 hard 횟수는 거부한다", () => {
  for (const bad of [-1, 6, 2.5, NaN]) assert.throws(() => L.classify(bad));
});

t("같은 개수면 어느 장면에서 골랐든(표시 순서와 무관) 같은 유형이다", () => {
  const a = L.classify(L.countHard(answersWith([true, false, true, false, false]))).name;
  const b = L.classify(L.countHard(answersWith([false, false, false, true, true]))).name;
  assert.equal(a, b);
});

t("표시 순서: 교대로 나오고 rng와 무관하게 강경이 한쪽에 몰리지 않는다", () => {
  for (const r of [0, 0.49, 0.5, 0.99]) {
    const o = L.displayOrders(5, () => r);
    assert.equal(o.length, 5);
    for (let i = 1; i < o.length; i++) assert.notDeepEqual(o[i], o[i - 1]);
    o.forEach((p) => assert.deepEqual([...p].sort(), [0, 1]));
  }
});

t("패턴 한 줄", () => {
  assert.equal(L.patternLine(answersWith([true, true, false, false, false])),
    "강경을 고른 장면: 1·2번, 온건을 고른 장면: 3·4·5번");
  assert.equal(L.patternLine(answersWith([true, true, true, true, true])),
    "강경을 고른 장면: 1·2·3·4·5번, 온건을 고른 장면: 없음");
});

t("글자 수는 공백을 뺀다 / 학번은 5자리 숫자", () => {
  assert.equal(L.charCount(" 가 나\n다 "), 3);
  assert.ok(L.isValidSid("30512"));
  for (const bad of ["3051", "305123", "abcde", "", null]) assert.ok(!L.isValidSid(bad));
});

t("payload: 스키마 그대로, choicesJson은 문자열", () => {
  const answers = answersWith([true, true, false, false, false]);
  const p = L.buildPayload({ sid: " 30512 ", name: "효니", gameName: "G", answers, focusName: "조광조의 개혁", focusStage: 2, reflection: "본문" });
  assert.deepEqual(Object.keys(p).sort(),
    ["choiceSummary", "choicesJson", "diffSummary", "gameName", "reflection", "studentId", "studentName"]);
  assert.equal(p.studentId, "30512");
  assert.equal(p.choiceSummary, "강경 2 · 온건 3 / 균형 잡는 조율가형");
  assert.equal(p.diffSummary, "조광조의 개혁");
  assert.equal(typeof p.choicesJson, "string");
  const j = JSON.parse(p.choicesJson);
  assert.equal(j.focusStage, 2);
  assert.deepEqual(j.choices[0], { stage: 1, hard: true, choiceId: "s1-hard" });
  assert.equal(j.choices.length, 5);
});

t("reflection: 고른 선택 문장을 함께 적고, 없으면 그 줄을 빼며, 라벨·원문이 들어간다", () => {
  const labels = WRITING.map((w) => w.label);
  const r = L.buildReflection("조광조의 개혁", labels, [" 첫째 ", "둘째"], "지금 바로 박탈해야 해.");
  assert.ok(r.startsWith("[가장 고민한 장면] 조광조의 개혁\n[내가 고른 선택] 지금 바로 박탈해야 해.\n\n"));
  assert.ok(r.includes(labels[0] + "\n첫째") && r.includes(labels[1] + "\n둘째"));
  const r2 = L.buildReflection("조광조의 개혁", labels, ["a", "b"]);
  assert.ok(!r2.includes("[내가 고른 선택]"));
});

t("data: 분기 5개, 각 분기에 강경/온건 선택지가 정확히 하나씩", () => {
  assert.equal(STAGES.length, 5);
  for (const s of STAGES) {
    assert.equal(s.choices.length, 2);
    assert.deepEqual(s.choices.map((c) => c.hard).sort(), [false, true]);
  }
  assert.equal(BRIDGES.length, 4);
  BRIDGES.forEach((b) => assert.ok(b.length <= 3, "연결 카드는 3줄 이내"));
  assert.equal(WRITING.length, 2);
  WRITING.forEach((w) => assert.ok(w.hint && !w.hintAlt, "힌트는 칸마다 하나, 질문형"));
});

t("data: {용어} 표기가 모두 용어 사전에 있다", () => {
  const texts = [];
  for (const s of STAGES) texts.push(s.scene, s.result, s.resultNote || "");
  BRIDGES.forEach((b) => texts.push(...b));
  for (const txt of texts) {
    for (const m of txt.matchAll(/\{([^}]+)\}/g)) assert.ok(GLOSSARY[m[1]], "사전에 없는 용어: " + m[1]);
  }
  for (const s of STAGES) for (const k of s.terms) assert.ok(GLOSSARY[k], "사전에 없는 용어: " + k);
});

console.log("\n" + passed + "개 통과");
