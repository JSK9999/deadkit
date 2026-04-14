# deadkit

**AI 코딩 규칙/스킬 사용 분석 및 설정 최적화 도구.**

규칙 136개, 스킬 5개를 설치했습니다. 진짜 쓰이는 건 몇 개일까요?

> [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)를 34개 실제 세션으로 테스트:
> **61개 규칙 dead (관련성 0%). 5개 스킬 미호출. 9만 토큰 낭비 — 컨텍스트 45% 소실.**

**[English README](README.md)**

## deadkit이 하는 것

| # | 기능 | 방법 | 출력 |
|---|------|------|------|
| 1 | **규칙별 관련성 %** | 세션 로그: 세션당 언어 매칭 | `security.md 83%`, `rust/testing.md 0% DEAD` |
| 2 | **스킬별 사용량** | 세션 로그: Skill 호출 횟수 | `/investigate 3회`, `/qa 0 UNUSED` |
| 3 | **죽은 규칙** | 모든 세션에서 관련성 0%인 규칙 | `136개 중 61개 dead` |
| 4 | **미사용 스킬** | 설치만 하고 미호출 | `5개 중 4개 unused` |
| 5 | **중복** | Jaccard 유사도 (오탐 0건) | `essential.md <-> security.md 겹침` |
| 6 | **토큰 낭비** | 파일 크기 / 4 + 스킬 description | `~9만 토큰 (컨텍스트 45%)` |
| 7 | **효율 비교** | 내 사용 데이터 + 토큰 분석 | `ECC 34.6% vs my-rules 95.3%` |
| 8 | **사용 추이** | PostToolUse 훅 추적 | 일별 활동 차트 |
| 9 | **알림** | 낮은 관련성 + 미사용 자동 감지 | `! rust/testing.md is DEAD` |

## deadkit이 안 하는 것

- ~~규칙 준수율~~ — "Claude가 이 규칙을 따랐나?"는 LLM 필요. 약한 모델이 강한 모델을 판별하는 건 신뢰 불가.
- ~~코드 품질 증명~~ — 규칙이 더 나은 결과를 만들었는지 증명 불가.

**deadkit은 측정 가능한 것만 정확하게 측정합니다.**

## 데모

![deadkit 데모](demo/demo.gif)

## 바로 시작

```bash
npx deadkit            # 기본 분석
npx deadkit report     # 규칙별 관련성 + 알림
npx deadkit init       # 추적 훅 설치 (1회)
npx deadkit trend      # 사용 추이
```

API 키 불필요. 설정 불필요. 런타임 의존성 0개. 1-3초 소요.

## 명령어

### `deadkit` — 기본 분석

죽은 규칙, 미사용 스킬, 중복, 토큰 비용. 일회성 스캔.

### `deadkit report` — 관련성 리포트

실제 세션 데이터 기반 규칙별 관련성 퍼센트:

```
deadkit report
===============
5 rules, 5 skills | 19 sessions analyzed | ~953 tokens

RULE RELEVANCE
  commit.md                      100%  ████████████████████  19/19
  essential.md                   100%  ████████████████████  19/19
  security.md                    100%  ████████████████████  19/19
  python/testing.md               12%  ██░░░░░░░░░░░░░░░░░░   2/19 LOW
  rust/patterns.md                 0%  ░░░░░░░░░░░░░░░░░░░░   0/19 DEAD

SKILL ACTIVITY
  /investigate                     3 calls
  /review                          0 calls UNUSED

ALERTS
  ! rust/patterns.md is DEAD — 0% relevance
  ! /review never called — consider removing

SUMMARY
  3 active rules (>20% relevance)
  1 low relevance rules (<20%)
  1 dead rules (0%)
  1 active skills, 1 unused
```

### `deadkit compare` — 설정 비교

```bash
deadkit compare ./ecc-rules/ ./my-rules/
```

```
YOUR USAGE (based on 29 sessions)
  .ts 13%, .tsx 13%, .py 8%

                    ecc-rules    my-rules
-----------------------------------------
Total tokens           38,167         953
Dead tokens            24,844           0
Efficiency              34.6%       95.3%

Winner: my-rules (95.3% efficiency)
```

### `deadkit init` + `deadkit trend` — 지속적 추적

```bash
deadkit init    # PostToolUse 훅 설치
deadkit trend   # 일별 활동 확인
```

```
DAILY ACTIVITY
  2026-04-07  ██████████████████ 3 edits (1 skill calls)
  2026-04-08  ██████████████████ 3 edits (2 skill calls)
  2026-04-09  ██████████████████████████████ 5 edits

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

CI = 정적 분석만. 관련성/죽은 규칙 감지는 로컬 세션 로그 필요.

## FAQ

### Q: Claude Code 세션이 초기화되면 데이터가 사라지나요?

deadkit은 두 가지 데이터 소스를 사용합니다:

1. **Claude Code 세션 로그** (`~/.claude/projects/*/*.jsonl`) — Claude Code가 관리. 세션이 초기화되면 이 데이터는 사라질 수 있습니다.
2. **deadkit 자체 히스토리** (`~/.deadkit/history.jsonl`) — deadkit 훅이 관리. Claude Code와 독립적. 세션 초기화와 무관하게 유지됩니다.

`deadkit init`을 실행하면 훅이 `~/.deadkit/history.jsonl`에 지속적으로 기록합니다. Claude Code가 세션 로그를 삭제해도 deadkit의 추적 데이터는 그대로 남습니다.

**권장**: `deadkit init`을 일찍 실행하세요. 훅이 오래 돌수록 관련성 데이터가 정확해집니다.

### Q: 규칙 준수율을 왜 측정 못 하나요?

"Claude가 이 규칙을 따랐는지" 확인하려면 Claude의 출력을 맥락에서 이해해야 합니다. 이건 LLM이 필요합니다. 하지만 약한 모델(Haiku)로 강한 모델(Opus)의 행동을 판별하는 건 신뢰할 수 없습니다 — 평가자가 스스로 못 하는 행동을 정확히 평가할 수 없기 때문입니다.

같은 모델(Opus)로 평가하면 정확하지만 비용이 너무 높습니다.

이건 로드맵이 아니라 근본적 한계입니다.

### Q: Cursor / Codex도 되나요?

현재 deadkit은 `.cursorrules` 파일의 정적 분석(중복, 토큰)은 지원합니다. 하지만 관련성 추적은 Claude Code 전용입니다 (JSONL 로그). Cursor와 Codex는 같은 형식의 세션 로그를 제공하지 않습니다.

### Q: 범용 규칙의 관련성은 어떻게 계산하나요?

`commit.md`나 `security.md` 같은 언어 비특화 규칙은 100% 관련으로 표시됩니다 — 언어와 무관하게 모든 세션에 적용되기 때문입니다. `python/testing.md`, `rust/patterns.md` 같은 언어별 규칙만 실제 파일 편집 기반의 가변 관련성을 갖습니다.

## 누가 필요한가

- **대형 규칙 세트 설치한 사람** (ECC, OMC, gstack) — 뭐가 죽었는지 모름
- **스킬 수집가** — 30개 이상 깔았는데 3개만 씀
- **팀 리더** — 도입 전 설정 건강 체크
- **규칙 세트 제작자** — 배포 전 품질 검증

## 검증 결과

| 테스트 | 결과 |
|--------|------|
| 죽은 규칙 정확도 | ECC 136개 → 61개 dead. 정확. |
| 관련성 % | 세션별 언어 추적 검증 완료 |
| 중복 감지 | 오탐 0건 |
| 스킬 추적 | 실제 JSONL 로그 구조 일치 확인 |
| 훅 수집 | 실시간 캡처 확인 |
| 성능 | 167MB, 32K줄 → 1-3초 |
| CI | PR 코멘트 테스트 완료 |

## 알려진 한계

- 관련성: 언어별 규칙만. 범용 규칙은 기본 100%.
- 부정어 무시: "Use X" vs "Never use X"가 중복으로 잡힐 수 있음.
- Claude 기본동작: 12개 패턴, 수동 관리, 불완전.
- **규칙 준수율이나 코드 품질 영향은 측정 불가.**

## 로드맵

### 완료
- [x] 죽은 규칙, 미사용 스킬, 중복, 토큰 비용
- [x] 규칙별 관련성 % (세션 데이터 기반)
- [x] 규칙 세트 효율 비교
- [x] 훅 기반 지속적 추적
- [x] 낮은 관련성/죽은 규칙 알림
- [x] GitHub Action / GitLab CI

### 다음
- [ ] 토큰 예산 알림 (임계값 초과 시 PR 차단)
- [ ] 주간 건강 리포트 자동 생성
- [ ] 터미널 차트 시각화
- [ ] 훅 히스토리 기반 관련성 (세션 로그 대신)

### 미래
- [ ] 팀 단위 설정 분석
- [ ] 크로스 도구 비교 (Claude Code vs Cursor vs Codex)
- [ ] 웹 대시보드

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 라이선스

Apache 2.0
