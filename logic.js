/* logic.js — 화면과 무관한 순수 함수 모음(판정·표시 순서·제출문 조립).
 * 브라우저에서는 전역 BungdangLogic으로, Node(tests/logic.test.mjs)에서는 require로 쓴다.
 * DOM·fetch를 건드리지 않는다. */
(function (root) {
  "use strict";

  var STAGE_COUNT = 5;

  // 성향 결과(재미용). 강경(hard) 선택 횟수 n → 유형. 붕당명은 쓰지 않는다.
  var TYPES = {
    5: { name: "끝장 승부 개혁가형", desc: "다섯 번 모두 판을 확 바꾸는 쪽을 골랐어. 문제가 보이면 미루지 않는 타입." },
    4: { name: "밀어붙이는 승부사형", desc: "대부분 강하게 밀어붙였고, 딱 한 번만 숨을 골랐어." },
    3: { name: "타이밍 재는 전략가형", desc: "강하게 나간 장면이 더 많지만, 물러설 때를 아는 편이야." },
    2: { name: "균형 잡는 조율가형", desc: "강하게 나갈 때와 손잡을 때를 나눠서 골랐어." },
    1: { name: "손잡고 가는 포용가형", desc: "웬만하면 같이 가는 쪽을 골랐어. 딱 한 번만 강하게 나갔어." },
    0: { name: "차근차근 안정 수호가형", desc: "다섯 번 모두 충돌을 줄이는 쪽을 골랐어." }
  };

  function countHard(answers) {
    var n = 0;
    for (var i = 0; i < answers.length; i++) if (answers[i] && answers[i].hard === true) n++;
    return n;
  }

  function classify(n) {
    if (!Number.isInteger(n) || n < 0 || n > STAGE_COUNT) throw new Error("hard 횟수는 0~5여야 해: " + n);
    return TYPES[n];
  }

  // 선택지 표시 순서: 첫 분기는 무작위, 이후는 교대 → 강경이 항상 위/아래에 오지 않는다.
  // 반환값 [0,1]이면 데이터 배열 순서 그대로, [1,0]이면 뒤집기. rng는 테스트용으로 주입 가능.
  function displayOrders(count, rng) {
    var r = rng || Math.random;
    var flip = r() < 0.5;
    var out = [];
    for (var i = 0; i < count; i++) {
      out.push(flip ? [1, 0] : [0, 1]);
      flip = !flip;
    }
    return out;
  }

  function stagesWith(answers, wantHard) {
    var list = [];
    for (var i = 0; i < answers.length; i++) {
      if (answers[i] && answers[i].hard === wantHard) list.push(answers[i].stage);
    }
    return list;
  }

  // "강경을 고른 장면: 1·2번, 온건을 고른 장면: 3·4·5번"
  function patternLine(answers) {
    function fmt(list) { return list.length ? list.join("·") + "번" : "없음"; }
    return "강경을 고른 장면: " + fmt(stagesWith(answers, true)) +
           ", 온건을 고른 장면: " + fmt(stagesWith(answers, false));
  }

  // 공백을 뺀 글자 수
  function charCount(s) { return String(s || "").replace(/\s+/g, "").length; }

  function isValidSid(sid) { return /^\d{5}$/.test(String(sid || "").trim()); }

  function buildReflection(focusName, labels, texts) {
    var lines = ["[가장 고민한 장면] " + focusName, ""];
    for (var i = 0; i < labels.length; i++) {
      lines.push(labels[i]);
      lines.push(String(texts[i] || "").trim());
      lines.push("");
    }
    return lines.join("\n").replace(/\s+$/, "");
  }

  // 시트 저장용 payload. choicesJson은 문자열(백엔드가 그대로 저장한다).
  function buildPayload(o) {
    var n = countHard(o.answers);
    var t = classify(n);
    return {
      studentId: String(o.sid).trim(),
      studentName: String(o.name).trim(),
      gameName: o.gameName,
      choiceSummary: "강경 " + n + " · 온건 " + (STAGE_COUNT - n) + " / " + t.name,
      diffSummary: o.focusName || "",
      reflection: o.reflection,
      choicesJson: JSON.stringify({
        choices: o.answers.map(function (a) { return { stage: a.stage, hard: a.hard, choiceId: a.choiceId }; }),
        focusStage: o.focusStage
      })
    };
  }

  // Padlet 붙여넣기용 전체 제출문
  function buildCopyText(o) {
    var n = countHard(o.answers);
    var t = classify(n);
    var lines = [];
    lines.push("[조선 붕당 분화 시뮬레이션 — 선택 장면 글쓰기]");
    lines.push("학번/이름: " + String(o.sid).trim() + " " + String(o.name).trim());
    lines.push("");
    lines.push("■ 성향 결과(재미용): " + t.name + " (강경 " + n + " · 온건 " + (STAGE_COUNT - n) + ")");
    lines.push("■ 나의 선택 기록");
    for (var i = 0; i < o.answers.length; i++) {
      var a = o.answers[i];
      lines.push(a.stage + ". " + a.stageName + " — " + a.choiceText + " → " + a.stand);
    }
    lines.push("");
    lines.push(o.reflection);
    return lines.join("\n");
  }

  var api = {
    STAGE_COUNT: STAGE_COUNT, TYPES: TYPES,
    countHard: countHard, classify: classify, displayOrders: displayOrders,
    patternLine: patternLine, charCount: charCount, isValidSid: isValidSid,
    buildReflection: buildReflection, buildPayload: buildPayload, buildCopyText: buildCopyText
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BungdangLogic = api;
})(typeof window !== "undefined" ? window : globalThis);
