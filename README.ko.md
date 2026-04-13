# deadkit

**규칙 136개를 설치했습니다. 61개는 죽었습니다. 컨텍스트의 45%가 사라졌습니다.**

[Everything Claude Code](https://github.com/affaan-m/everything-claude-code), [Oh My ClaudeCode](https://github.com/Yeachan-Heo/oh-my-claudecode), 또는 대형 규칙/스킬 세트를 설치했다면 — deadkit이 뭐가 진짜 작동하고 뭐가 토큰만 낭비하는지 알려줍니다.

**[English README](README.md)**

## 데모

![deadkit 데모](demo/demo.gif)

## 바로 시작

```bash
npx deadkit
```

API 키 불필요. 설정 불필요. 런타임 의존성 0개. 1-3초 소요.

## 누가 필요한가

- **대형 규칙 세트 설치한 사람** (ECC, OMC, gstack, superpowers) — 뭐가 죽었는지 모름
- **스킬 수집가** — 30개 이상 깔았는데 실제로 3개만 씀
- **팀 리더** — AI 코딩 표준 세팅 전 설정 건강 체크
- **규칙 세트 제작자** — 배포 전 품질 검증

규칙 5개 직접 쓰고 뭐가 있는지 아는 사람은 필요 없습니다.

## 찾아주는 것

```
$ npx deadkit

deadkit v0.3.0
===============

Scanned: 5 rules (5 global, 0 project), 5 skills
Total token cost: ~1,622 tokens (0.8% of context)

DEAD RULES (based on 34 sessions across all projects)
  Languages you actually use:
    .ts      13%
    .tsx     13%
    .py      8%
  No dead rules found — all rules match your usage.

SKILLS (5 installed, ~669 description tokens)
  Never used:
    /investigate — never called
    /office-hours — never called
    /qa — never called

OVERLAPPING DIRECTIVES (1 found)
  "Validate all external inputs"
  -> repeated in: essential.md, security.md

REDUNDANT WITH CLAUDE DEFAULTS
  "Read related files before making changes"
  -> Claude Code already does this by default

SUMMARY
  5 UNUSED skill(s) — installed but never called
  1 overlapping directive(s)
  3 redundant with Claude defaults
```

### 규칙 (패시브 — 매 프롬프트 로드)

| 검사 | 방법 |
|------|------|
| **죽은 규칙** | 세션 로그에서 실제 편집 언어 확인. C++ 규칙인데 `.cpp` 편집 0회 = dead |
| **중복** | Jaccard 유사도. 테스트: 오탐 0건 |
| **겹치는 지시사항** | 여러 파일에 복붙된 동일 지시문 |
| **기본 동작 중복** | Claude가 이미 하는 12가지 패턴 매칭 |
| **토큰 비용** | 파일 크기 / 4. 컨텍스트 예산 대비 비율 |

### 스킬 (액티브 — 사용자 호출)

| 검사 | 방법 |
|------|------|
| **미사용** | 세션 로그에서 Skill 호출 검색. 설치만 하고 미호출 = 미사용 |
| **겹치는 스킬** | description이 비슷하면 Claude가 잘못 선택할 수 있음 |
| **설명 토큰 비용** | 스킬 description은 매 세션 로드. 156개 = ~15K 토큰/세션 |

## 규칙 세트 비교

내 실제 사용 데이터를 기준으로 서로 다른 설정의 효율을 비교합니다:

```bash
deadkit compare ./ecc-rules/ ./my-rules/
```

```
YOUR USAGE (based on 29 sessions)
  .ts 13%, .tsx 13%, .py 8%, .html 10%

                    ecc-rules    my-rules
-----------------------------------------
Rules                      89           5
Total tokens           38,167         953
Dead tokens            24,844           0
Effective tokens       13,188         908
Efficiency              34.6%       95.3%

Winner: my-rules (95.3% efficiency)
```

공식: `효율 = 유효 토큰 / 전체 토큰`
`유효 = 전체 - dead - 중복 - 기본동작 중복`

**내 세션 데이터 기준**이라 같은 규칙 세트도 사용자마다 점수가 다릅니다.

## 지속적 추적

```bash
deadkit init    # 훅 설치 (1회)
deadkit trend   # 추이 확인
```

Claude Code PostToolUse 훅으로 모든 Edit/Write/Skill 호출을 `~/.deadkit/history.jsonl`에 기록합니다.

```
deadkit trend
=============
DAILY ACTIVITY
  2026-04-07  ██████████████████ 3 edits (1 skill calls)
  2026-04-08  ██████████████████ 3 edits (2 skill calls)
  2026-04-09  ██████████████████████████████ 5 edits
  2026-04-10  ██████████████████████████████ 5 edits (1 skill calls)

TOP LANGUAGES
  .ts      11 edits
  .tsx     1 edits
  .py      1 edits

SKILL USAGE
  /review               2 calls
  /investigate          2 calls
```

## CI

### GitHub Action

```yaml
name: Rule Health Check
on: [pull_request]
permissions:
  pull-requests: write
  contents: read
jobs:
  deadkit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: JSK9999/deadkit@main
        with:
          paths: '.claude/rules'
```

### GitLab CI

```yaml
deadkit:
  stage: test
  image: node:20
  script:
    - npx deadkit .claude/rules --json > report.json
  artifacts:
    paths: [report.json]
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

CI는 정적 분석만 (중복, 토큰, 모호함). 죽은 규칙 감지는 로컬 세션 로그가 필요합니다.

## 검증 결과

| 테스트 | 결과 |
|--------|------|
| 죽은 규칙 정확도 | ECC 136개 → 61개 dead (10개 언어, 0 편집). 정확. |
| 중복 감지 | Jaccard 0.6 기준 오탐 0건 |
| 스킬 추적 | 실제 JSONL 로그 구조 일치 확인 |
| 훅 수집 | 실시간 캡처 확인 |
| 성능 | 167MB 로그, 32K줄 → 1-3초 |
| CI (GitHub Action) | PR 코멘트 자동 생성. [테스트 완료.](https://github.com/JSK9999/deadrule/pull/6) |

## 알려진 한계

- 죽은 규칙 감지는 **언어별 규칙만** 가능. 범용 규칙(`common/security.md`)은 스킵.
- "Use X" vs "Never use X"가 중복으로 잡힐 수 있음 (부정어가 stop word로 필터링).
- Claude 기본 동작 목록이 수동 관리(12개). 불완전.
- 규칙이 *더 나은 결과를 만들었는지*는 증명 못 함 — 로드 여부만 판별.

## 로드맵

### 현재: 대형 규칙 세트용 설정 건강 검진
- [x] 죽은 규칙, 미사용 스킬, 중복, 토큰 비용
- [x] 규칙 세트 효율 비교
- [x] 훅 기반 지속적 추적
- [x] GitHub Action / GitLab CI

### 다음: 세션 수준 옵저버빌리티
- [ ] 세션별 토큰 분석 (각 세션이 얼마나 컨텍스트를 쓰는지)
- [ ] 토큰 예산 알림 (규칙이 임계값 초과 시 경고)
- [ ] 주간 건강 리포트 자동 생성
- [ ] 터미널 차트 시각화

### 미래: 팀 & 크로스 도구
- [ ] 팀 단위 설정 분석
- [ ] 크로스 도구 비교 (Claude Code vs Cursor vs Codex)
- [ ] 규칙 효과 점수 (커뮤니티 베이스라인 필요)
- [ ] 웹 대시보드

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 라이선스

Apache 2.0
