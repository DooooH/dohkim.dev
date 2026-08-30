---
title: '멀티테넌트 권한 경계를 Fail-Closed로 재설계'
subtitle: 'Fail-Closed Authorization Boundary for Multi-Tenant Resource Isolation'
description: '관리자 전체 조회 정책은 유지하되, 비관리자 요청은 브랜드·지역 scope를 backend에서 검증하도록 권한 경계를 재정의했습니다. 단건·다건 action과 dashboard query까지 동일한 기준을 적용했습니다.'
tech:
  - Java
  - Spring
  - SQL
order: 1
publishDate: 2026-03-01
---

## 개요

다중 테넌트 환경에서 비관리자가 권한 없는 resource ID를 직접 전달하거나 permission scope가 비어 있는 상태에서 데이터가 노출될 수 있었던 인가 취약점을 해결했습니다. 프론트엔드의 단순 UI 제어에 의존하지 않고, 백엔드 서비스와 SQL 매퍼 계층에 Fail-closed 인가 검증과 테넌트 scope 필터링을 직접 구현했습니다. 이를 통해 기존 관리자의 전역 조회 정책을 온전히 보존하면서, 비관리자 경로의 잠재적인 리소스 접근(IDOR) 위험을 backend 인가 경계 수준에서 방어하도록 일관되게 정리했습니다.

## 기술적·비즈니스적 제약 조건

- **기존 관리자 전역 조회 보존**: 기존 백오피스 관리자 워크플로우에 영향을 주지 않도록 관리자용 전역 조회 권한은 그대로 유지해야 했습니다.
- **클라이언트 비의존성**: 프론트엔드 UI의 메뉴 숨김이나 비활성화 처리에 의존하지 않고, 백엔드 엔진 계층에서 직접 위조된 ID 접근을 차단해야 했습니다.
- **모호한 권한의 안전 처리**: 테넌트의 브랜드/지역 권한 scope가 비어 있거나 해석이 모호한 요청이 인입될 경우 시스템 접근을 즉시 차단(fail-closed)해야 했습니다.

## Failure Condition & Root Cause

- **Failure Condition**: 비관리자가 권한 없는 resource ID를 직접 전달하거나, permission scope가 비어 있는 상태에서 API 및 실시간 대시보드를 호출할 때 타 테넌트의 데이터가 노출될 수 있었습니다.
- **Root Cause**: 리소스 상세 조회, 리셋, 다운로드, 삭제 경로에서 브랜드 유효성 검증(brand validation)이 누락되어 있었고, 대시보드 실시간 쿼리에 admin/brand/region scope 파라미터 필터가 부재했습니다.

## 설계 결정 및 트레이드오프 (Trade-off & Decision)

- **선택한 방식**: 
  - 기존 admin의 전체 조회 정책은 유지하되, non-admin 요청에는 인가된 brand/region scope를 엄격히 적용했습니다.
  - blank 또는 ambiguous한 scope는 예외를 던지며 접근을 차단(fail-closed)하도록 구성했습니다.
  - 컨트롤러/서비스 계층의 개별 리소스 권한 검증과 SQL 매퍼 수준의 범위 제한 쿼리를 함께 배치하는 심층 방어(Defense-in-depth)를 구축했습니다.
- **포기하거나 감수한 것**: 
  - 관리자와 일반 사용자의 쿼리 경로를 완전 분리하는 대신 동적 SQL 필터를 적용하여 매퍼 및 쿼리 복잡도가 다소 증가했습니다.
- **합리적이었던 이유**: 
  - 대규모 DB 스키마 변경이나 별도 인가 프록시 도입 없이 10개 핵심 파일 변경만으로 권한 없는 테넌트의 데이터 탈취 가능성을 즉시 차단할 수 있었습니다.

## 직접 구현한 범위 (Implementation Scope)

- **단일 리소스 유효성 검증 로직 구현**: detail, reset, download, delete 경로의 인가 체크
- **대량 ID 필터링 로직 구현**: 벌크 조회 시 인가된 ID 목록만 선별 처리
- **정보 노출 방지 처리**: 존재하지 않는 ID(missing ID)와 권한 없는 ID(unauthorized ID) 간의 응답 차이를 두지 않아 ID 열거 공격 완화
- **Scoped 대시보드 동적 SQL 작성**: 관리자/비관리자 조건별 스코프 필터링
- **컨트롤러, 서비스, 매퍼, SQL 등 총 10개 핵심 파일 직접 작성**

## 성과 지표 (KPI / SLO)

- **Actual**: 
  - 단일 리소스 검증, 벌크 ID 필터링, 스코프 대시보드 쿼리 적용 완료 (10개 파일 수정, Jira Done).
- **Measurement Candidate** *(향후 계측 권장 지표)*:
  - 비인가 리소스 접근 차단 성공률 (Unauthorized Access Rejection Rate)
  - 인가 필터 주입 전후 P99 쿼리 레이턴시 오버헤드

## 남아 있는 운영 한계

- E2E 권한 회귀 테스트(Regression Test) 자동화 실행 결과 및 프로덕션 환경의 실시간 접근 로그를 통한 차단 건수 분석 데이터는 추가 검증이 필요합니다.
