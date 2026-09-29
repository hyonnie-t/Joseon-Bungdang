/* config.js — 설정값만 둔다. 콘텐츠는 data.js, 판정 로직은 logic.js, 화면은 app.js. */
const CONFIG = {
  // 포털 config.js의 차시(활동) id와 글자 하나까지 같아야 포털이 "완료"로 인식한다.
  GAME_NAME: "붕당분화_나라면_시뮬레이션",

  // history26_backend Apps Script 웹앱 (새 배포 금지 — 배포 관리 > 수정 > 새 버전만)
  SHEET_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec",

  // 서술 칸마다 최소 글자 수(공백 제외). 수행평가 3점 기준(사실 활용 + 당시 사회 고려)에서
  // '분량 부족 = 1점'이라 최소선을 둔다. 바꾸려면 여기만 고친다.
  MIN_CHARS: 40,

  // ?preview=1일 때 sid/name이 없으면 채울 값
  PREVIEW_SID: "30500",
  PREVIEW_NAME: "미리보기"
};
