# 스스닷컴 공개 페이지 — stores-scout.com

랜딩 페이지와 상담 페이지. React + Vite 정적 빌드를 GitHub Pages 로 내보낸다.
코드는 `web/` 아래에 있다.

## 이 저장소에 없는 것

상권분석 파이프라인, 계수, 판정 로직, 심의 콘솔, SaaS 서버는 **여기 없다.**
비공개 저장소 `stores-scout` 에 있다. 공개 페이지는 원본 매출·원가 모델을 담지
않고, 고객 요청 시 백엔드의 익명 집계 결과만 받아 표시한다.

- 배포 워크플로(`.github/workflows/deploy-pages.yml`)가 빌드 산출물에서 백엔드 원본
  필드·인증키·승인되지 않은 전송 코드를 찾으면 배포를 멈춘다.
- 비공개 저장소의 CI 가 이 저장소를 받아 소스 단위 검사와 상담 CSV 계약(열 이름이
  파이프라인의 `읽는키` 와 같아야 한다)을 돌린다.

## 상담 페이지가 지키는 것

고객 성명·연락처는 서버로 보내지 않는다. 예상매출을 요청할 때 입력한 부동산
상세 주소만 공개 집계 API로 전송하고, 원본 매출·고객정보는 전송하지 않는다.
내려받기는 두 파일로 가른다 — 상담카드(개인정보 있음)와 조건(없음).

## 유동인구·매출을 지어내지 않는다

예시 숫자를 넣지 않는다. 상담 결과의 예상매출은 백엔드가 실제로 조회한 소상공인365
유동인구와 내부 매출의 구 단위 집계가 있을 때만 표시한다. 지점별 원본 매출·주소·
영수건수는 공개 응답에 포함하지 않으며, 결과에는 데이터 범위와 참고용 추정치라는
주의를 함께 표시한다.

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
고객 공개 집계 API 주소는 `VITE_STORE_SCOUT_API_ORIGIN` 으로 둔다.
배포에서는 Repository secret `KAKAO_MAP_JS_KEY` 를 쓴다. 브라우저용 JavaScript 키만
쓴다. REST·Admin 키는 넣지 않는다.

## 도메인

`web/public/CNAME` 이 스위치다. 없으면 `https://<user>.github.io/stores-scout-web/`,
있으면 `https://stores-scout.com/`. 도메인은 Settings → Pages 에서 붙이고, 그 뒤에
CNAME 파일을 넣는다. 순서를 어기면 몇 분 동안 사이트가 깨진다.
DNS 레코드·검증·되돌리기·저장소 옮기기는 [DEPLOY.md](DEPLOY.md).
