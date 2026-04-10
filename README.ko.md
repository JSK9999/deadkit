# deadkit

**AI 코딩 인프라 옵저버빌리티 — 죽은 규칙, 안 쓰는 스킬, 토큰 낭비를 찾아줍니다.**

AI 코딩 생태계에는 규칙을 *만드는* 도구(ECC, gstack, superpowers)와 LLM API 호출을 *모니터링*하는 도구(Langfuse, Helicone)가 있습니다. 하지만 아무도 묻지 않습니다: **"내 규칙이 진짜 효과가 있나?"**

deadkit이 그 빈자리에 있습니다. AI 코딩 설정이 살아있는지 죽었는지 측정하는 첫 번째 도구입니다.

> [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) (136개 규칙, 5개 스킬)를
> 391개 로그 파일(167MB)의 34개 실제 세션으로 테스트했습니다:
>
> **61개 규칙이 죽었고, 5개 스킬은 한 번도 호출되지 않았습니다. 9만 토큰 낭비 — 컨텍스트의 45%가 사라졌습니다.**

**[English README](README.md)**

## 데모

![deadkit 데모](demo/demo.gif)

## 바로 시작

```bash
# 일회성 분석
npx deadkit

# 지속적 추적 시작
npx deadkit init

# 몇 세션 후 추이 확인
npx deadkit trend
```

API 키 불필요. 설정 불필요. 런타임 의존성 0개.

## 검증 결과

실제 데이터로 테스트했습니다:

| 테스트 | 결과 | 상세 |
|--------|------|------|
| 죽은 규칙 정확도 | 정확 | ECC 136개: 61개 dead (10개 언어 파일 편집 0회) |
| 중복 감지 | 정확 | Jaccard 0.6 기준 오탐 0건 |
| 스킬 추적 | 정확 | 실제 JSONL 로그 구조와 일치 확인 |
| 훅 수집 | 동작 중 | 세션 중 Edit/Write/Skill 호출 실시간 캡처 |
| 성능 | 빠름 | 167MB 로그 (32K줄, 391개 파일) → 1~3초 |

## 찾아주는 것

### 규칙 (패시브 — 매 프롬프트 항상 로드)

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

### 지속적 추적 (Phase 2 — v0.2.0 신규)

| 명령 | 하는 일 |
|------|---------|
| `deadkit init` | Claude Code 훅 설치, 자동 데이터 수집 |
| `deadkit trend` | 일별 활동, 주요 언어, 스킬 사용량 추이 |

## 동작 원리

**죽은 규칙**: deadkit은 Claude Code 세션 로그(`~/.claude/projects/*/*.jsonl`)를 모든 프로젝트에 걸쳐 읽습니다. `Edit`/`Write` 도구 호출에서 편집한 파일 확장자를 추출하고, 규칙과 대조합니다. Python 규칙 + `.py` 편집 0회 = 죽은 규칙.

**미사용 스킬**: 세션 로그에서 `Skill` 도구 호출을 검색합니다. 설치됐지만 한 번도 호출되지 않은 스킬 = 미사용.

**지속적 추적**: `deadkit init`은 PostToolUse 훅을 설치해 모든 Edit/Write/Skill 호출을 `~/.deadkit/history.jsonl`에 기록합니다. 시간이 지나면 `deadkit trend`로 사용 패턴 변화를 볼 수 있습니다.

**왜 중요한가**: 모든 규칙은 매 프롬프트에 로드됩니다. 모든 스킬 description도 로드됩니다. 죽은 규칙과 미사용 스킬은 컨텍스트 윈도우를 조용히 낭비합니다 — 그리고 지금까지 아무도 이걸 측정하지 않았습니다.

## 두 가지 모드

| | 로컬 (`npx deadkit`) | CI (GitHub Action / GitLab) |
|---|---|---|
| 죽은 규칙 (세션 로그) | O | X (CI에는 로그 없음) |
| 미사용 스킬 (세션 로그) | O | X (CI에는 로그 없음) |
| 지속적 추적 | O | X |
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

## CLI

```bash
npx deadkit                    # 규칙 + 스킬 분석
npx deadkit ./rules/ ./agents/ # 커스텀 경로
npx deadkit --json             # CI/CD용 JSON
npx deadkit init               # 추적 훅 설치
npx deadkit trend              # 사용 추이 확인
npx deadkit trend --json       # 추이 데이터 JSON
```

## 우리가 채우는 빈자리

```
  규칙 생성 도구              ???              LLM 옵저버빌리티
  (ECC, gstack,          [deadkit]           (Langfuse, Helicone,
   superpowers)        "효과가 있나?"           Datadog LLM)
       |                    |                       |
  규칙/스킬 생성        효과 측정              API 호출 모니터링
```

**"내 규칙이 효과가 있나? 스킬이 쓰이고 있나? 컨텍스트를 얼마나 낭비하나?"**

이 질문에 답하는 도구를 찾았습니다. 전 세계에 0개였습니다. deadkit이 첫 번째입니다.

## 로드맵: 린터에서 옵저버빌리티로

### Phase 1: 린터 (완료)
- [x] 죽은 규칙 감지 (세션 로그 분석)
- [x] 미사용 스킬 감지
- [x] 중복 / 겹침 / 모호함 분석
- [x] 토큰 비용 분석
- [x] `--json` 출력
- [x] GitHub Action / GitLab CI

### Phase 2: 지속적 수집 (완료)
- [x] `deadkit init` — Claude Code 훅 설치
- [x] `~/.deadkit/history.jsonl` — 세션 간 지표 누적
- [x] `deadkit trend` — 일별 활동 및 스킬 사용 추이
- [ ] 규칙별 히트 추적 (어떤 규칙이 실제로 응답에 영향을 줬는지)

### Phase 3: 트렌드 & 알림
- [ ] `deadkit trend --chart` — 터미널 차트 시각화
- [ ] 토큰 예산 임계값 — 규칙이 N 토큰 초과하면 PR 차단
- [ ] 스킬 드리프트 감지 — 스킬 사용 패턴 변화 알림
- [ ] 주간 리포트 자동 생성

### Phase 4: 대시보드 & 팀
- [ ] `deadkit dashboard` — 규칙/스킬 건강 상태 웹 UI
- [ ] 팀 단위 규칙 분석 (팀원 전체 집계)
- [ ] 규칙 효과 점수 (이 규칙이 코드 품질을 개선했나?)
- [ ] 크로스 도구 비교 (Claude Code vs Cursor vs Codex)

## 알려진 한계

솔직하게 공유합니다:

- **죽은 규칙 감지**는 언어별 규칙만 가능합니다 (예: `python/security.md`). `common/security.md` 같은 범용 규칙은 언어 매핑이 안 돼서 스킵됩니다.
- **부정어 무시**: "Use X"와 "Never use X"가 중복으로 잡힐 수 있습니다. stop word(no, never, not)가 필터링되기 때문입니다.
- **Claude 기본 동작 목록**이 수동 관리(12개 패턴)라 불완전합니다. 기여 환영합니다.
- **스킬 추적**은 `~/.claude/skills/`만 대상입니다. 빌트인 스킬과 프로젝트 스킬은 아직 미지원.
- **인과 증명 불가**: 규칙이 *로드*됐지만 *관련 없음*(dead)은 알 수 있지만, 규칙이 *더 나은 결과를 만들었는지*(effectiveness)는 아직 증명 못 합니다. Phase 4 목표입니다.

## 도움이 필요합니다

이건 새로운 카테고리입니다 — **AI 코딩 설정 옵저버빌리티**. 오픈으로 만들고 있고, 실제 사용자의 피드백이 필요합니다.

**deadkit이 어떻게 쓰이면 좋겠나요?**

- [이슈 열기](https://github.com/JSK9999/deadkit/issues) — 사용 사례를 알려주세요
- `deadkit --json` 결과 공유 (익명화) — 실제 규칙/스킬 구성을 이해하고 싶습니다
- Claude 기본 동작 패턴 제안 — `src/analyzers/defaults.ts` ([good first issue](https://github.com/JSK9999/deadkit/issues))
- `deadkit init` 사용 후 일주일 뒤 `deadkit trend` 결과 공유

규칙 생성과 LLM 모니터링 사이의 이 빈자리가 AI 코딩 생태계에서 가장 방치된 레이어라고 믿습니다. 같이 증명해주세요.

## 기여

[CONTRIBUTING.md](CONTRIBUTING.md)에서 설정 방법과 가이드라인을 확인하세요.

## 라이선스

Apache 2.0
