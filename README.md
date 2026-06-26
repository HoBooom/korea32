# 한국 32강 진출 트래커 (2026 월드컵)

2026 FIFA 월드컵에서 한국 대표팀의 **32강(베스트 3위) 진출 가능성**을 실시간으로 추적하는 웹앱입니다.

- ① 실시간 진출 가능성(경우의 수 비율) + 12개 조 3위 순위
- ② 오늘 경기 일정/현황 + 각 경기의 한국 유불리 표시
- ③ 향후 일정에서 어떤 결과가 나와야 진출하는지 시나리오

기술: Next.js (App Router) · TypeScript · Tailwind v4. 디자인은 `designed.md`(Pinterest 디자인 시스템) 토큰을 따릅니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:3000
```

**별도 API 키 없이 바로 실시간 데이터가 표시됩니다.**

## 데이터 소스

- **기본: [worldcup26.ir](https://github.com/rezarahiminia/worldcup2026)** — 무료·오픈소스, 인증 불필요. 12개 조 순위/72경기/라이브 스코어를 제공하며 약 30초 이내로 갱신됩니다. 한국 팀은 FIFA 코드(KOR)로 자동 인식합니다.
- (선택) **API-Football** — `DATA_SOURCE=apifootball` + `APISPORTS_KEY` 설정 시 사용. 단, **무료 플랜은 2026 시즌을 제공하지 않으므로** 유료 플랜이 필요합니다.
- 위 소스 호출에 실패하면 자동으로 **데모 데이터**로 폴백하고 사유를 화면에 표시합니다.

환경변수(선택, 모두 생략 가능): `DATA_SOURCE`, `KOREA_TEAM_ID`, `WORLDCUP26_BASE`. API-Football용은 `.env.local.example` 참고.

> ⚠️ 경기 시각: worldcup26는 UTC 필드를 제공하지 않아 개최지 현지시각(미 동부, EDT 가정)으로 KST를 **근사 변환**합니다. 일부 중·서부 경기는 수 시간 오차가 있을 수 있습니다. 페어플레이(경고) 데이터도 없어 동점이 거기까지 가면 별도 확인이 필요합니다.

## 핵심 로직

- `lib/scenarios.ts` — 남은 경기를 전수(또는 표본) 탐색해 한국 진출 여부·경우의 수 비율·경기별 유불리를 계산
- `lib/thirdPlace.ts` — 3위 팀 비교(승점→골득실→다득점→페어플레이→FIFA랭킹)
- `lib/dataSource.ts` — 데이터 소스 선택 + 폴백
- `lib/worldcup26.ts` / `lib/apiFootball.ts` — 각 소스 어댑터(정규화·호출·캐싱)

## 테스트 / 빌드

```bash
npm test         # 시나리오 엔진 · 3위 비교 단위 테스트
npm run build
```

## 배포 (Vercel)

저장소를 Vercel에 연결하고 환경변수 `APISPORTS_KEY`를 추가하면 됩니다.

> 진출 가능성은 남은 경기의 **경우의 수 비율**이며 팀 전력을 반영한 실제 확률과는 다릅니다. 골 차이는 근사 계산되며, 페어플레이 점수까지 가는 동점은 무료 티어 데이터 한계로 별도 확인이 필요할 수 있습니다.
