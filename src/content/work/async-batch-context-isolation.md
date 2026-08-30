---
title: '비동기 배치의 Shared Mutable State 격리'
subtitle: 'Per-Invocation Context Isolation for Asynchronous Batch Execution'
description: '공유 mutable Map으로 실행별 request context가 덮일 수 있는 조건을 재현하고, 각 invocation에 독립된 state와 UUID를 부여하도록 구조를 변경했습니다.'
tech:
  - Java
  - JUnit
order: 2
publishDate: 2026-02-15
---

## 개요

비동기 배치 실행 루프에서 가변(mutable) Map 참조가 스레드 간에 공유되어 후속 루프의 식별자(requestId, instanceId)가 이전 비동기 작업의 컨텍스트를 덮어쓰던 execution-context contamination 문제를 진단했습니다. 복잡한 락 동기화를 도입하는 대신 루프 반복마다 독립적인 실행 컨텍스트와 고유 UUID를 생성해 전달하도록 단순화했습니다. 333행의 검증 테스트를 직접 작성하여 다중 인스턴스 환경에서도 상태 오염 없는 안전한 비동기 배치를 구현했습니다.

## 기술적·비즈니스적 제약 조건

- **기존 비동기 스레드 풀 구조 유지**: 비동기 배치 실행 프레임워크와 스레드 풀 할당 정책을 전면 재작성하지 않고 문제를 해결해야 했습니다.
- **동시성 경합 상태 제거**: 다수의 테스트 인스턴스를 동시 실행할 때 이력 테이블(`TB_TST_EXECUTION_HIST`) 인서트 시 PK 충돌(`DuplicateKeyException`)이 발생하지 않아야 했습니다.

## Failure Condition & Root Cause

- **Failure Condition**: `groupExecute`/`batchExecute`를 통해 여러 시험을 동시에 비동기 배치 실행할 때, 후속 iteration이 실행 컨텍스트를 덮어쓰며 이전 비동기 작업이 잘못된 식별자를 참조해 DB 인서트 중복 에러가 발생했습니다.
- **Root Cause**: 반복 루프 외부에 단일 `reqMap` 인스턴스를 선언하고, 각 iteration마다 `requestId`와 `instanceId` 값만 변경한 채 동일한 맵 참조(Reference)를 비동기 실행 스레드로 넘겨주어 데이터 레이스(Data Race)가 발생했습니다.

## 설계 결정 및 트레이드오프 (Trade-off & Decision)

- **선택한 방식**: 
  - 공유 가변 맵에 동기화 락(`synchronized` 또는 ConcurrentMap)을 적용하는 대신, 루프 반복 시마다 새로운 `HashMap`과 고유 UUID를 생성하여 비동기 실행 단위별로 메모리 컨텍스트를 완전 격리했습니다.
- **포기하거나 감수한 것**: 
  - 매 호출마다 독립적인 Map 객체와 UUID를 생성함에 따른 경미한 단기 메모리 할당(GC 압력)을 수용했습니다.
- **합리적이었던 이유**: 
  - 락 경합(Lock Contention)에 따른 배치 처리 속도 저하나 데드락 위험을 원천 배제하면서, 동시성 환경에서의 참조 공유 부수 효과(Side-effect)를 가장 명확하고 단순하게 차단할 수 있었습니다.

## 직접 구현한 범위 (Implementation Scope)

- **비동기 배치 서비스 코드 리팩터링**: 가변 맵 재사용 제거 및 인스턴스별 독립 실행 컨텍스트 생성
- **동시성 검증 테스트 스위트 작성**:
  - 각 인스턴스별 독립 맵 생성 여부 검증
  - 비동기 태스크 간 고유 `requestId` 및 올바른 `instanceId` 바인딩 검증
  - 빈 인스턴스 목록 입력 시 불필요한 비동기 호출 방지 검증
- **서비스 수정 및 약 333행의 신규 단위/동시성 테스트 작성 오너십 수행**

## 성과 지표 (KPI / SLO)

- **Actual**: 
  - 서비스 로직 격리 구현 및 333행 분량의 동시성/인스턴스 분리 단위 테스트 스위트 통과 (Jira Done).
- **Measurement Candidate** *(향후 계측 권장 지표)*:
  - 동시 배치 실행 시 DB `DuplicateKeyException` 발생 빈도 (프로덕션 런타임 추적 지표)
  - 동시 태스크 간 파라미터 오염 발생률 (0% 유지 여부)

## 남아 있는 운영 한계

- 공유 맵 덮어쓰기 결함은 코드 레벨과 단위 테스트로 확실히 입증·해결되었으나, 프로덕션 환경의 `DuplicateKeyException` 발생 원인이 오직 이 결함 단 하나뿐이었는지는 추가 런타임 트레이스 관측이 필요합니다.
