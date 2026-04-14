# deadkit

**AI 코딩 규칙/스킬 사용 분석 및 설정 최적화 도구.**

규칙 136개, 스킬 5개를 설치했습니다. 진짜 쓰이는 건 몇 개일까요?

> [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)를 34개 실제 세션으로 테스트:
> **61개 규칙 dead. 5개 스킬 미호출. 9만 토큰 낭비 — 컨텍스트 45% 소실.**

**[English README](README.md)**

## deadkit이 하는 것

| # | 기능 | 방법 | 정확도 |
|---|------|------|--------|
| 1 | **죽은 규칙** | 세션 로그: 실제 편집 언어 확인 | 객관적 |
| 2 | **미사용 스킬** | 세션 로그: 실제 호출 기록 확인 | 객관적 |
| 3 | **중복** | Jaccard 유사도 비교 | 객관적 (오탐 0건) |
| 4 | **토큰 낭비** | 파일 크기 / 4 (규칙 + 스킬 description) | 객관적 |
| 5 | **기본동작 중복** | Claude 기본 행동 12개 패턴 매칭 | 반객관적 |
| 6 | **효율 비교** | 내 사용 데이터 + 토큰 분석 | 객관적 |
| 7 | **사용 추이** | PostToolUse 훅 추적 | 객관적 |

## deadkit이 안 하는 것

- ~~규칙 준수율~~ — "Claude가 이 규칙을 따랐나?"는 LLM 평가가 필요. 약한 모델이 강한 모델의 행동을 판별하는 건 신뢰할 수 없음.
- ~~코드 품질 증명~~ — 규칙이 더 나은 결과를 *만들었는지* 증명 불가.
- ~~효과 점수~~ — 위 두 가지가 안 되면 이것도 불가.

**deadkit은 측정 가능한 것만 정확하게 측정합니다. 그 이상은 안 합니다.**

## 데모

![deadkit 데모](demo/demo.gif)

## 바로 시작

```bash
npx deadkit
```

API 키 불필요. 설정 불필요. 런타임 의존성 0개. 1-3초 소요.

## 누가 필요한가

- **대형 규칙 세트 설치한 사람** (ECC, OMC, gstack, superpowers) — 뭐가 죽었는지 모름
- **스킬 수집가** — 30개 이상 깔았는데 3개만 씀
- **팀 리더** — 도입 전 설정 건강 체크
- **규칙 세트 제작자** — 배포 전 품질 검증

규칙 5개 직접 쓰고 뭐가 있는지 아는 사람은 필요 없습니다.

## 출력 예시

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
    /office-hours — never called
    /qa — never called
    /review — never called

  Used:
    /investigate — 1 calls (last: 2026-04-13)

OVERLAPPING DIRECTIVES (1 found)
  "Validate all external inputs"
  -> repeated in: essential.md, security.md

REDUNDANT WITH CLAUDE DEFAULTS
  "Read related files before making changes"
  -> Claude Code already does this by default

SUMMARY
  4 UNUSED skill(s) — installed but never called
  1 overlapping directive(s)
  3 redundant with Claude defaults
```

## 비교

내 실제 사용 데이터 기준으로 규칙 세트 효율을 비교합니다:

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

`효율 = 유효 토큰 / 전체 토큰`

**내 데이터 기준**이라 같은 규칙 세트도 사용자마다 점수가 다릅니다.

## 지속적 추적

```bash
deadkit init    # 훅 설치 (1회)
deadkit trend   # 추이 확인
```

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

CI = 정적 분석만 (중복, 토큰). 죽은 규칙/미사용 스킬은 로컬 세션 로그 필요.

## CLI

```bash
npx deadkit                    # 분석
npx deadkit ./rules/ ./agents/ # 커스텀 경로
npx deadkit --json             # JSON 출력
npx deadkit init               # 추적 훅 설치
npx deadkit trend              # 추이 확인
npx deadkit compare <a> <b>    # 설정 비교
```

## 검증 결과

| 테스트 | 결과 |
|--------|------|
| 죽은 규칙 정확도 | ECC 136개 → 61개 dead. 정확. |
| 중복 감지 | 오탐 0건 |
| 스킬 추적 | 실제 JSONL 로그 구조 일치 확인 |
| 훅 수집 | 실시간 캡처 확인 |
| 성능 | 167MB, 32K줄 → 1-3초 |
| CI | PR 코멘트 테스트 완료 |

## 알려진 한계

- 죽은 규칙: 언어별 규칙만 가능. 범용 규칙(`common/security.md`)은 스킵.
- 부정어 무시: "Use X" vs "Never use X"가 중복으로 잡힐 수 있음.
- Claude 기본동작: 12개 패턴, 수동 관리, 불완전.
- **규칙 준수율이나 코드 품질 영향은 측정 불가.** 로드맵이 아니라 근본적 한계.

## 로드맵

### 현재
- [x] 죽은 규칙, 미사용 스킬, 중복, 토큰 비용
- [x] 규칙 세트 효율 비교
- [x] 훅 기반 지속적 추적
- [x] GitHub Action / GitLab CI

### 다음
- [ ] 토큰 예산 알림 (임계값 초과 경고)
- [ ] 주간 건강 리포트 자동 생성
- [ ] 터미널 차트 시각화
- [ ] 세션별 토큰 분석

### 미래
- [ ] 팀 단위 설정 분석
- [ ] 크로스 도구 비교 (Claude Code vs Cursor vs Codex)
- [ ] 웹 대시보드

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 라이선스

Apache 2.0
