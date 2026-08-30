---
title: 'Gen1 → Gen2 관제 데이터의 Semantic Compatibility 설계'
subtitle: 'Semantic Compatibility Adapter for Gen1-to-Gen2 Migration'
description: 'Gen1의 version·step·result를 그대로 복사하지 않고 Gen2 의미 모델에 맞춰 명시적으로 매핑했습니다. 세대 차이를 converter 내부의 compatibility boundary로 캡슐화했습니다.'
tech:
  - Go
order: 4
publishDate: 2026-01-15
---

## 개요

차세대 관제 플랫폼으로 이기종 데이터를 전환하는 과정에서 미구현 분기로 인해 레거시 상태값이 유실되거나 왜곡될 수 있었던 문제를 해결했습니다. 세대 간 데이터를 단순 복사하지 않고, Gen1의 버전별(1.2/1.3) 리포트와 롤백·재시도 단계 코드를 Gen2 도메인 상수로 1:1 명시적 매핑(explicit mapping)하는 Go 어댑터를 구축했습니다. 이를 통해 다운스트림 관제 시스템이 복잡한 레거시 버전의 파편화에 종속되지 않고 일관된 호환성 경계(compatibility boundary)를 확보하도록 구현했습니다.

## 기술적·비즈니스적 제약 조건

- **레거시 비정형 데이터 호환**: Gen1 시스템의 특수 보고서, 단계별 재시도/롤백, OTA 리셋 등 정형화되지 않은 분기 데이터를 완전하게 수용해야 했습니다.
- **컨슈머 무중단 보장**: 다운스트림 Gen2 시스템이 레거시 버전별 세부 코드의 파편화에 영향을 받지 않고 단일화된 코드 체계로 해석할 수 있어야 했습니다.

## Failure Condition & Root Cause

- **Failure Condition**: 특정 special-report 및 step/retry/rollback/OTA reset 이벤트 데이터에서 Gen1의 세부 상태 의미가 Gen2 모델로 전달될 때 정확하게 보존되지 않거나 유실될 수 있었습니다.
- **Root Cause**: 기존 변환기(Converter)의 일부 1.2/1.3 브랜치가 비어 있거나 TODO 상태였으며, Gen1의 버전별 step/result 의미를 Gen2 코드 체계로 명시적 매핑(Explicit Mapping)하지 않고 원시값을 그대로 패스스루하려 했습니다.

## 설계 결정 및 트레이드오프 (Trade-off & Decision)

- **선택한 방식**: 
  - 레거시 원시값을 그대로 전달하는 암묵적 변환을 배제하고, Go 언어 기반으로 버전별(1.2/1.3) 결과 코드와 단계를 Gen2 도메인 상수로 1:1 전수 명시 매핑했습니다.
- **포기하거나 감수한 것**: 
  - Go 변환기 내부의 매핑 테이블 및 분기 상수 정의 코드 라인이 다소 증가(+165/-56 lines)했습니다.
- **합리적이었던 이유**: 
  - 다운스트림 컨슈머 측에서의 역직렬화 런타임 오류 및 데이터 의미 왜곡을 컴파일 타임과 어댑터 레이어에서 원천 차단할 수 있었습니다.

## 직접 구현한 범위 (Implementation Scope)

- **Go 기반 Semantic Converter 및 도메인 상수 확장**:
  - Gen1 1.2 및 1.3 버전 브랜치의 미구현(TODO) 변환 로직 완성
  - Step, Retry, Rollback, OTA Reset 관련 세부 결과 코드 전수 명시적 매핑
  - Go 코드베이스 +165 / -56 라인 변경 작성 및 Git 커밋/PR 주도 (Jira Done)

## 성과 지표 (KPI / SLO)

- **Actual**: 
  - Go 변환기 코드베이스 수정(+165/-56), 1.2/1.3 및 상세 단계별 분기 커버리지 확장 완료 (Jira Done).
- **Measurement Candidate** *(향후 계측 권장 지표)*:
  - Gen1 → Gen2 변환 시 미매핑 상태 코드 발생률 (Unmapped Code Rate: 0%)
  - 다운스트림 관제 컨슈머의 원격 제어 상태 불일치 리포트 건수

## 남아 있는 운영 한계

- 외부 컨슈머 측의 최종 수용 테스트(Acceptance Test) 결과와 장기 운영 데이터상의 의미 정확도 통계는 추가 관측이 필요합니다.
