// 배포 전 점검. 실행: node scripts/verify.mjs  (실패하면 종료 코드 1)
// 1) 학생 화면 문자열에 검증 라벨 0건  2) 화면 문자열에 교과서 쪽수 0건  3) 시트 URL 원본 일치
// 4) TODO/자동완성/효과음/CDN 0건  5) 규칙 위반 구조(init 위치) 확인
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(root, f), "utf8");

// 원본: history26 CLAUDE.md / webapp-builder 스킬에 적힌 배포 URL
const EXPECTED_URL =
  "https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec";

const problems = [];
const fail = (m) => problems.push(m);

// 주석 제거(쪽수·출처는 주석에만 둘 수 있다)
function stripComments(src, kind) {
  if (kind === "html") return src.replace(/<!--[\s\S]*?-->/g, "");
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

const screenFiles = { "index.html": "html", "data.js": "js", "app.js": "js", "logic.js": "js" };
const BANNED = ["검수", "대조", "미확인", "2차", "확인 전"];
const BANNED_MISC = [/\bTODO\b/i, /autoFill/i, /자동\s*완성/, /AudioContext/, /효과음/];

for (const [file, kind] of Object.entries(screenFiles)) {
  const body = stripComments(read(file), kind);
  for (const w of BANNED) if (body.includes(w)) fail(`${file}: 금지 라벨 "${w}" 발견`);
  for (const re of BANNED_MISC) if (re.test(body)) fail(`${file}: 금지 패턴 ${re} 발견`);
  if (/\bp\.\s?\d+/.test(body) || /\d+\s?쪽/.test(body)) fail(`${file}: 화면 문자열에 교과서 쪽수 흔적`);
  if (/<script[^>]+src=["']https?:/i.test(body) || /<link[^>]+href=["']https?:/i.test(body)) fail(`${file}: 외부 CDN 사용`);
}
const css = stripComments(read("style.css"), "js");
if (/@import|url\(\s*["']?https?:/.test(css)) fail("style.css: 외부 리소스 사용");

// 시트 URL: 원본과 글자 하나까지 일치해야 한다
const cfg = read("config.js");
const m = cfg.match(/SHEET_WEBAPP_URL:\s*"([^"]+)"/);
if (!m) fail("config.js: SHEET_WEBAPP_URL 없음");
else if (m[1] !== EXPECTED_URL) fail("config.js: SHEET_WEBAPP_URL이 원본과 다름");
if (!/GAME_NAME:\s*"[^"]+"/.test(cfg)) fail("config.js: GAME_NAME 없음");

// TDZ 방지: init()은 app.js 맨 마지막 실행문
const app = stripComments(read("app.js"), "js").trimEnd().split("\n").filter((l) => l.trim());
if (app[app.length - 1].trim() !== "init();") fail("app.js: 마지막 실행문이 init(); 이 아님");

// 필수 4요소 흔적
const appSrc = read("app.js");
if (!/get\("sid"\)/.test(appSrc) || !/get\("name"\)/.test(appSrc)) fail("app.js: ?sid=&name= 자동채움 없음");
if (!/get\("preview"\) === "1"/.test(appSrc)) fail("app.js: ?preview=1 없음");
if (!/막막하면 힌트 보기/.test(appSrc)) fail("app.js: 힌트 토글 라벨 없음");

if (problems.length) {
  console.error("verify 실패:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log("verify 통과: 금지 라벨·쪽수·CDN·TODO 0건, 시트 URL 원본 일치, init() 마지막 위치");
