# 배포 — stores-scout.com (GitHub Pages)

이 저장소의 `web/` 이 `https://stores-scout.com/` 으로 나간다. 배포는
`.github/workflows/deploy-pages.yml` 이 main push 마다 한다. 아래는 도메인을 붙이고
되돌리는 절차다. 2026-09-10 에 옛 저장소(stores-scout)에서 이 저장소로 옮겨 왔다.

## 공개 페이지 도메인

공개 페이지(`web/`)는 `https://stores-scout.com/` 에 떠 있다. CNAME 스위치가 없으면
`https://jasonsjo.github.io/stores-scout-web/` 로 돌아간다(저장소 이름이 경로가 된다).
여기에 `stores-scout.com` 을 붙이는 절차다. **순서가 있다.** 어기면 몇 분 동안
사이트가 두 주소 모두에서 깨진다 — 오류가 아니라 흰 화면이다.

### 한 도메인, 두 자리

| 주소 | 무엇 | 어디서 뜨나 | 누가 보나 |
|---|---|---|---|
| `stores-scout.com` · `www.` | 공개 페이지(소개 · 고객 상담) | GitHub Pages | 누구나 |
| `api.stores-scout.com` | 심의 콘솔(SaaS) | 사내 서버 + Cloudflare Tunnel — 비공개 저장소 stores-scout | 사내 · Access 뒤 |

둘 다 Cloudflare 의 같은 zone 에 레코드로 들어간다. 이 절은 첫 줄(공개 페이지)이고,
둘째 줄은 비공개 저장소 stores-scout 의 DEPLOY.md 「사내 서버 + Cloudflare Tunnel」 절에서 붙인다.

### 0. 먼저 볼 것 — 이 도메인이 누구 것인가

```bash
dig +short stores-scout.com A        # 또는  nslookup stores-scout.com
whois stores-scout.com | grep -i "registrar\|name server"
```

2026-09-03 현재 `stores-scout.com` 은 **아무 데도 풀리지 않는다** — 레코드가 하나도
없다는 뜻이고, 그게 맞는 출발점이다. `dig` 가 GitHub 도 Cloudflare 도 아닌 IP 를
내면 누군가(등록기관 파킹 페이지 등)가 먼저 잡고 있는 것이니 그때는 멈추고 소유를
확인한다. 이름이 비슷한 `store-scout.com`(s 없음)은 **남의 것이다** — 89.31.143.90
을 가리키고 있다. 헷갈려서 그쪽에 레코드를 넣거나 CNAME 에 적으면 안 된다.
워크플로가 `stores-scout.com` 이 아닌 CNAME 을 거부하는 이유이기도 하다.

### 1. DNS 레코드 — Cloudflare(또는 등록기관) DNS 화면에서

| 종류 | 이름 | 값 | Proxy |
|---|---|---|---|
| A | `@` | `185.199.108.153` | **DNS only (회색)** |
| A | `@` | `185.199.109.153` | DNS only |
| A | `@` | `185.199.110.153` | DNS only |
| A | `@` | `185.199.111.153` | DNS only |
| AAAA | `@` | `2606:50c0:8000::153` | DNS only |
| AAAA | `@` | `2606:50c0:8001::153` | DNS only |
| AAAA | `@` | `2606:50c0:8002::153` | DNS only |
| AAAA | `@` | `2606:50c0:8003::153` | DNS only |
| CNAME | `www` | `jasonsjo.github.io` | DNS only |

> **Proxy 는 끄십시오(회색 구름).** 주황 구름(Proxied)으로 두면 GitHub 가 도메인
> 검증과 인증서 발급을 못 하고, Cloudflare SSL 모드가 Flexible 이면 리다이렉트가
> 무한히 돈다. TLS 는 GitHub 가 이미 해 주므로 Cloudflare 가 앞에 설 이유가 없다.
> `api.` 는 터널이라 사정이 다르다 — 그쪽은 터널이 알아서 Proxied 로 만든다.

넣고 나서 확인. **GitHub 의 IP 네 개가 나올 때까지** 다음으로 가지 않는다:

```bash
dig +short stores-scout.com A          # 185.199.108.153 … 111.153 넷
dig +short www.stores-scout.com CNAME  # jasonsjo.github.io.
```

반영에 몇 분, 등록기관 DNS 면 길게는 하루.

### 1.5. GitHub 프로필 — Verified domains (한 번만)

<https://github.com/settings/pages> → **Add a domain** → `stores-scout.com`. 화면에 나오는
`_github-pages-challenge-jasonsjo` TXT 레코드를 Cloudflare DNS 에 넣고 **Verify**.
도메인이 저장소 사이를 옮겨 다니는 동안 남이 자기 Pages 에 붙이지 못하게 막는다.

### 2. GitHub — Settings → Pages → Custom domain

`stores-scout.com` 을 넣고 **Save**. GitHub 가 DNS 를 검사한다(1분 안팎). 초록
체크가 뜨면 **Enforce HTTPS** 를 켠다 — 인증서 발급에 몇 분에서 한 시간.

이 순간부터 `jasonsjo.github.io/stores-scout-web/` 는 `stores-scout.com` 으로 넘어간다.
그런데 지금 올라가 있는 빌드는 자산을 `/stores-scout-web/assets/…` 에서 찾으므로,
**다음 단계를 바로 이어서** 해야 한다. 그 사이는 흰 화면이다.

### 3. 저장소 — 스위치 파일 하나

```bash
echo stores-scout.com > web/public/CNAME
git add web/public/CNAME
git commit -m "도메인을 붙인다 — stores-scout.com"
git push origin main
```

이 파일이 있으면 워크플로가 base 를 `/` 로 잡아 빌드한다(`deploy-pages.yml` 의
「Decide base」). 사람이 워크플로를 고칠 일이 없다. 파일 내용이 `stores-scout.com`
이 아니면 배포가 멈춘다 — 오타 난 도메인은 사이트를 두 주소 모두에서 내리기
때문이다. GitHub 는 Actions 배포에서 이 파일을 읽지 않는다. 우리 쪽 스위치다.

배포(1분 안팎)가 끝나면:

```bash
curl -sI https://stores-scout.com/                 | head -1   # 200
curl -sI https://stores-scout.com/consultation/    | head -1   # 200
curl -sI https://www.stores-scout.com/             | head -1   # 301 → stores-scout.com
curl -sI https://jasonsjo.github.io/stores-scout-web/  | head -1   # 301 → stores-scout.com
```

브라우저에서 상담 화면을 열어 주소 검색과 CSV 내려받기가 되는지까지 본다.
자산 경로가 어긋났으면 화면이 하얗고 개발자도구 Network 에 404 가 줄지어 있다.

### 되돌리기

`web/public/CNAME` 을 지우고 push, GitHub Settings → Pages 의 Custom domain 을
비운다. 그러면 `jasonsjo.github.io/stores-scout-web/` 로 돌아간다. 순서는 반대로 —
파일을 먼저 지워 base 를 `/stores-scout-web/` 로 돌린 뒤 Settings 를 비운다.

### 저장소를 옮길 때 (2026-09-10 에 한 순서)

1. 새 저장소에 `web/` 과 워크플로를 올리고, Secrets 에 `KAKAO_MAP_JS_KEY`, Settings →
   Pages → Source = GitHub Actions. CNAME 파일은 아직 넣지 않는다.
2. 배포 한 번 돌려 `jasonsjo.github.io/<저장소>/` 에서 가드와 빌드를 확인한다.
3. 프로필 Verified domains 에 `stores-scout.com` (위 1.5).
4. 옛 저장소 Settings → Pages 에서 Custom domain 제거 → 새 저장소에 추가 → Enforce HTTPS.
5. 새 저장소에 CNAME 파일을 넣고 push. 4 와 5 사이가 사이트가 끊기는 구간이다(1~2분).

Pages 사이트는 워크플로 토큰으로 만들 수 없다(관리자 권한). Source 를 손으로 켜기 전에는
`configure-pages` 가 "Get Pages site failed … Not Found" 로 멈춘다.
