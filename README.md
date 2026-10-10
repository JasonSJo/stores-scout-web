# 스스닷컴 공개 페이지 — stores-scout.com

랜딩 페이지와 상담 페이지. React + Vite 정적 빌드를 GitHub Pages 로 내보낸다.
코드는 `web/` 아래에 있다.

## 이 저장소에 없는 것

상권분석 파이프라인, 계수, 판정 로직, 심의 콘솔, SaaS 서버는 **여기 없다.**
비공개 저장소 `stores-scout` 에 있다. 공개 페이지는 그쪽 값을 하나도 담지 않아야
하고, 그것을 두 겹으로 지킨다.

- 배포 워크플로(`.github/workflows/deploy-pages.yml`)가 빌드 산출물에서 백엔드 낱말,
  외부 전송 코드, 백엔드 주소를 찾으면 배포를 멈춘다.
- 비공개 저장소의 CI 가 이 저장소를 받아 소스 단위 검사와 상담 CSV 계약(열 이름이
  파이프라인의 `읽는키` 와 같아야 한다)을 돌린다.

## 상담 페이지가 지키는 것

고객 성명·연락처를 받는 화면이다. 서버로 보내지 않는다. `fetch`, `XMLHttpRequest`,
`sendBeacon`, `WebSocket`, `localStorage`, `sessionStorage` 가 소스에 있으면 검사가
막는다. 내려받기는 두 파일로 가른다 — 상담카드(개인정보 있음)와 조건(없음).

## 유동인구·매출을 지어내지 않는다

예시라고 적어도 화면에 찍힌 숫자는 숫자다. 가맹희망자가 보는 화면에 예상매출이 나오면
가맹사업법 예상매출액 산정서와 섞인다. `예상매출`, `매출계수` 같은 낱말은 가드가 막는다.

## 로컬

```bash
cd web
npm ci
npm run typecheck
npm run build          # base 는 기본 /stores-scout-web/
STORE_SCOUT_BASE=/ npm run build   # 사용자 도메인 기준
node --test tests/*.mjs
```

카카오맵 JavaScript 키는 `web/.env.local` 에 `VITE_KAKAO_MAP_JS_KEY` 로 둔다.
배포에서는 Repository secret `KAKAO_MAP_JS_KEY` 를 쓴다. 브라우저용 JavaScript 키만
쓴다. REST·Admin 키는 넣지 않는다.

## 도메인

`web/public/CNAME` 이 스위치다. 없으면 `https://<user>.github.io/stores-scout-web/`,
있으면 `https://stores-scout.com/`. 도메인은 Settings → Pages 에서 붙이고, 그 뒤에
CNAME 파일을 넣는다. 순서를 어기면 몇 분 동안 사이트가 깨진다.
DNS 레코드·검증·되돌리기·저장소 옮기기는 [DEPLOY.md](DEPLOY.md).
