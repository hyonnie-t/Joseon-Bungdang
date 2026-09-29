/* config.js — 설정값만 둔다. 콘텐츠는 data.js, 판정 로직은 logic.js, 화면은 app.js. */
const CONFIG = {
  // 포털 config.js의 차시(활동) id와 글자 하나까지 같아야 포털이 "완료"로 인식한다.
  GAME_NAME: "붕당분화_나라면_시뮬레이션",

  // history26_backend Apps Script 웹앱 (새 배포 금지 — 배포 관리 > 수정 > 새 버전만)
  SHEET_WEBAPP_URL: "https://script.google.com/macros/s/AKfycbyXSjCfWY_HiZFqW_OBR-FQDoIfF1z_STqyKWUI31MacHeY3u7hbirFSFDvW-5yuUHaJQ/exec",

  // 서술 칸마다 최소 글자 수(공백 제외). 한두 문장이면 넘도록 20자로 낮췄다(v1.3).
  // '분량 부족 = 1점'이라 최소선을 둔다. 바꾸려면 여기만 고친다.
  MIN_CHARS: 20,

  // 3학년 반별 Padlet(웹앱 글쓰기 제출용). 학번의 학년·반으로 자기 반 링크만 보여 준다.
  // 링크가 바뀌면 여기만 고친다(포털 config.js의 urlByBan과 같은 값).
  PADLET_URL_BY_BAN: {
    5: "https://padlet.com/dy_sch03/2026-2-3-5-cewq8vec8p3ew2yn",
    6: "https://padlet.com/dy_sch03/2026-2-3-6-2xngg3v8pstkvld9",
    7: "https://padlet.com/dy_sch03/2026-2-3-7-8ssvnriy75f7xwxs",
    8: "https://padlet.com/dy_sch03/2026-2-3-8-gsrz2i3ca863675l"
  },

  // ?preview=1일 때 sid/name이 없으면 채울 값
  PREVIEW_SID: "30500",
  PREVIEW_NAME: "미리보기"
};
