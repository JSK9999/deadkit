# deadkit

**AI 코딩 설정에서 죽은 규칙과 안 쓰는 스킬을 찾아줍니다.**

> 스킬 5개, 규칙 136개를 설치했습니다. 진짜 쓰이는 건 몇 개일까요?
>
> [Everything Claude Code](https://github.com/affaan-m/everything-claude-code)를 34개 실제 세션으로 테스트했습니다:
> **61개 규칙이 죽었고, 5개 스킬은 한 번도 호출되지 않았습니다. 9만 토큰 낭비 — 컨텍스트의 45%가 사라졌습니다.**

**[English README](README.md)**

## 데모

![deadkit 데모](demo/demo.gif)

## 바로 시작

```bash
npx deadkit
```

API 키 불필요. 설정 불필요. 런타임 의존성 0개.

## 찾아주는 것

### 규칙 (패시브 — 항상 로드)

| 검사 | 찾는 것 |
|------|---------|
| **죽은 규칙** | 한 번도 쓰지 않는 언어의 규칙 (세션 로그 기반) |
| **중복 파일** | 서로 겹치는 규칙 파일 |
| **겹치는 지시사항** | 여러 파일에 복붙된 동일 지시문 |
| **기본 동작 중복** | Claude가 이미 하는 행동을 또 지시하는 규칙 |
| **모호한 지시사항** | 너무 추상적이라 실행 불가능한 지시문 |
| **토큰 비용** | 각 규칙 파일이 소비하는 토큰 수 |
| **오래된 규칙** | 90일 이상 수정되지 않은 규칙 |

### 스킬 (액티브 — 사용자가 호출)

| 검사 | 찾는 것 |
|------|---------|
| **미사용** | 설치만 하고 한 번도 호출하지 않은 스킬 |
| **사용 통계** | 각 스킬 호출 횟수, 마지막 사용 시점 |
| **겹치는 스킬** | 설명이 비슷한 스킬 (Claude가 잘못 선택할 수 있음) |
| **설명 토큰 비용** | 스킬 description 토큰 (매 세션 로드) |

## 동작 원리

**죽은 규칙**: deadkit은 Claude Code 세션 로그(`~/.claude/projects/*/*.jsonl`)를 읽습니다. `Edit`/`Write` 도구 호출에서 편집한 파일 확장자를 추출하고, 규칙과 대조합니다. Python 규칙 + `.py` 편집 0회 = 죽은 규칙.

**미사용 스킬**: 세션 로그에서 `Skill` 도구 호출을 검색합니다. 설치됐지만 한 번도 호출되지 않은 스킬 = 미사용. 설명이 겹치는 스킬은 Claude가 잘못 선택할 수 있습니다.

**왜 중요한가**: 모든 규칙은 매 프롬프트에 로드됩니다. 모든 스킬 description도 로드됩니다. 죽은 규칙과 미사용 스킬은 컨텍스트 윈도우를 조용히 낭비합니다.

## 두 가지 모드

| | 로컬 (`npx deadkit`) | CI (GitHub Action / GitLab) |
|---|---|---|
| 죽은 규칙 (세션 로그) | O | X (CI에는 로그 없음) |
| 미사용 스킬 (세션 로그) | O | X (CI에는 로그 없음) |
| 중복 / 겹침 | O | O |
| 기본 동작 중복 | O | O |
| 토큰 비용 | O | O |

## GitHub Action

```yaml
# .github/workflows/deadkit.yml
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

## GitLab CI

```yaml
# .gitlab-ci.yml
deadkit:
  stage: test
  image: node:20
  script:
    - npx deadkit .claude/rules --json > deadkit-report.json
    - cat deadkit-report.json
  artifacts:
    paths:
      - deadkit-report.json
  rules:
    - if: $CI_MERGE_REQUEST_IID
```

## CLI 옵션

```bash
npx deadkit                    # 기본 스캔
npx deadkit ./rules/ ./agents/ # 커스텀 경로
npx deadkit --json             # CI/CD용 JSON 출력
```

## 스캔 대상

- `~/.claude/rules/*.md` (글로벌 규칙)
- `~/.claude/skills/*/SKILL.md` (설치된 스킬)
- `.claude/rules/*.md` (프로젝트 규칙)
- `CLAUDE.md` (프로젝트 루트)
- `.cursorrules` (Cursor)

## 로드맵: 린터에서 옵저버빌리티로

deadkit은 일회성 린터에서 **AI 코딩 인프라 옵저버빌리티** 레이어로 진화합니다.

### Phase 1: 린터 (현재)
- [x] 죽은 규칙 감지 (세션 로그 분석)
- [x] 미사용 스킬 감지
- [x] 중복 / 겹침 / 모호함 분석
- [x] 토큰 비용 분석
- [x] `--json` 출력
- [x] GitHub Action / GitLab CI

### Phase 2: 지속적 수집
- [ ] `deadkit init` — Claude Code 훅 설치, 매 세션 자동 데이터 수집
- [ ] `.deadkit/history.json` — 세션 간 지표 누적 저장소
- [ ] 규칙별 히트 추적 (어떤 규칙이 실제로 응답에 영향을 줬는지)
- [ ] 스킬별 호출 빈도 + 타임스탬프

### Phase 3: 트렌드 & 알림
- [ ] `deadkit trend` — 주간/월간 토큰 사용량 추이
- [ ] `deadkit trend --chart` — 터미널 차트 시각화
- [ ] 토큰 예산 임계값 — 규칙이 N 토큰 초과하면 PR 차단
- [ ] 스킬 드리프트 감지 — 스킬 사용 패턴 변화 알림

### Phase 4: 대시보드 & 팀
- [ ] `deadkit dashboard` — 규칙/스킬 건강 상태 웹 UI
- [ ] 팀 단위 규칙 분석 (팀원 전체 집계)
- [ ] 규칙 효과 점수 (이 규칙이 코드 품질을 개선했나?)
- [ ] 크로스 도구 비교 (Claude Code vs Cursor vs Codex)

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)에서 설정 방법과 가이드라인을 확인하세요.

## 라이선스

Apache 2.0
