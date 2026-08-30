# 주요 시스템 설계 및 엔지니어링 프로젝트 상세 명세서

본 문서는 포트폴리오에 수록된 4개 주요 백엔드 엔지니어링 프로젝트의 상세 기술 명세(제약 조건, 장애 조건, 아키텍처 결정 및 트레이드오프, 직접 구현 범위, 실측 및 권장 KPI, 잔여 한계)를 통합하여 제공합니다.

---

## 목차
1. [멀티테넌트 권한 경계를 Fail-Closed로 재설계](#1-멀티테넌트-권한-경계를-fail-closed로-재설계)
2. [비동기 배치의 Shared Mutable State 격리](#2-비동기-배치의-shared-mutable-state-격리)
3. [Sub-second Metric Pipeline의 시간축 정합성 개선](#3-sub-second-metric-pipeline의-시간축-정합성-개선)
4. [Gen1 → Gen2 관제 데이터의 Semantic Compatibility 설계](#4-gen1--gen2-관제-데이터의-semantic-compatibility-설계)

---

## 1. 멀티테넌트 권한 경계를 Fail-Closed로 재설계

### 메타데이터
- **Title (Primary)**: 멀티테넌트 권한 경계를 Fail-Closed로 재설계
- **Subtitle (Secondary)**: Fail-Closed Authorization Boundary for Multi-Tenant Resource Isolation
- **Stack**: Java, Spring, SQL (MyBatis)
- **One-liner**: 관리자 전체 조회 정책은 유지하되, 비관리자 요청은 브랜드·지역 scope를 backend에서 검증하도록 권한 경계를 재정의했습니다. 단건·다건 action과 dashboard query까지 동일한 기준을 적용했습니다.

### 1.1 개요
다중 테넌트 환경에서 비관리자가 권한 없는 resource ID를 직접 전달하거나 permission scope가 비어 있는 상태에서 데이터가 노출될 수 있었던 인가 취약점을 해결했습니다. 프론트엔드의 단순 UI 제어에 의존하지 않고, 백엔드 서비스와 SQL 매퍼 계층에 Fail-closed 인가 검증과 테넌트 scope 필터링을 직접 구현했습니다. 이를 통해 기존 관리자의 전역 조회 정책을 온전히 보존하면서, 비관리자 경로의 잠재적인 리소스 접근(IDOR) 위험을 backend 인가 경계 수준에서 방어하도록 일관되게 정리했습니다.

### 1.2 기술적·비즈니스적 제약 조건 (Constraints)
- **기존 관리자 전역 조회 보존**: 기존 백오피스 관리자 워크플로우에 영향을 주지 않도록 관리자용 전역 조회 권한은 그대로 유지해야 했습니다.
- **클라이언트 비의존성**: 프론트엔드 UI의 메뉴 숨김이나 비활성화 처리에 의존하지 않고, 백엔드 엔진 계층에서 직접 위조된 ID 접근을 차단해야 했습니다.
- **모호한 권한의 안전 처리**: 테넌트의 브랜드/지역 권한 scope가 비어 있거나 해석이 모호한 요청이 인입될 경우 시스템 접근을 즉시 차단(fail-closed)해야 했습니다.

### 1.3 Failure Condition & Root Cause
- **Failure Condition**: 비관리자가 권한 없는 resource ID를 직접 전달하거나, permission scope가 비어 있는 상태에서 API 및 실시간 대시보드를 호출할 때 타 테넌트의 데이터가 노출될 수 있었습니다.
- **Root Cause**: 리소스 상세 조회, 리셋, 다운로드, 삭제 경로에서 브랜드 유효성 검증(brand validation)이 누락되어 있었고, 대시보드 실시간 쿼리에 admin/brand/region scope 파라미터 필터가 부재했습니다.

### 1.4 설계 결정 및 트레이드오프 (Trade-off & Decision)
- **선택한 방식**: 
  - 기존 admin의 전체 조회 정책은 유지하되, non-admin 요청에는 인가된 brand/region scope를 엄격히 적용했습니다.
  - blank 또는 ambiguous한 scope는 예외를 던지며 접근을 차단(fail-closed)하도록 구성했습니다.
  - 컨트롤러/서비스 계층의 개별 리소스 권한 검증과 SQL 매퍼 수준의 범위 제한 쿼리를 함께 배치하는 심층 방어(Defense-in-depth)를 구축했습니다.
- **포기하거나 감수한 것**: 
  - 관리자와 일반 사용자의 쿼리 경로를 완전 분리하는 대신 동적 SQL 필터를 적용하여 매퍼 및 쿼리 복잡도가 다소 증가했습니다.
- **합리적이었던 이유**: 
  - 대규모 DB 스키마 변경이나 별도 인가 프록시 도입 없이 10개 핵심 파일 변경만으로 권한 없는 테넌트의 데이터 탈취 가능성을 즉시 차단할 수 있었습니다.

### 1.5 직접 구현한 범위 (Implementation Scope)
- **단일 리소스 유효성 검증 로직 구현**: detail, reset, download, delete 경로의 인가 체크
- **대량 ID 필터링 로직 구현**: 벌크 조회 시 인가된 ID 목록만 선별 처리
- **정보 노출 방지 처리**: 존재하지 않는 ID(missing ID)와 권한 없는 ID(unauthorized ID) 간의 응답 차이를 두지 않아 ID 열거 공격 완화
- **Scoped 대시보드 동적 SQL 작성**: 관리자/비관리자 조건별 스코프 필터링
- **컨트롤러, 서비스, 매퍼, SQL 등 총 10개 핵심 파일 직접 작성**

### 1.6 성과 지표 (KPI / SLO)
- **Actual**: 
  - 단일 리소스 검증, 벌크 ID 필터링, 스코프 대시보드 쿼리 적용 완료 (10개 파일 수정, Jira Done).
- **Measurement Candidate (향후 계측 권장 지표)**:
  - 비인가 리소스 접근 차단 성공률 (Unauthorized Access Rejection Rate)
  - 인가 필터 주입 전후 P99 쿼리 레이턴시 오버헤드

### 1.7 남아 있는 운영 한계
- E2E 권한 회귀 테스트(Regression Test) 자동화 실행 결과 및 프로덕션 환경의 실시간 접근 로그를 통한 차단 건수 분석 데이터는 추가 검증이 필요합니다.

---

## 2. 비동기 배치의 Shared Mutable State 격리

### 메타데이터
- **Title (Primary)**: 비동기 배치의 Shared Mutable State 격리
- **Subtitle (Secondary)**: Per-Invocation Context Isolation for Asynchronous Batch Execution
- **Stack**: Java, JUnit
- **One-liner**: 공유 mutable Map으로 실행별 request context가 덮일 수 있는 조건을 재현하고, 각 invocation에 독립된 state와 UUID를 부여하도록 구조를 변경했습니다.

### 2.1 개요
비동기 배치 실행 루프에서 가변(mutable) Map 참조가 스레드 간에 공유되어 후속 루프의 식별자(requestId, instanceId)가 이전 비동기 작업의 컨텍스트를 덮어쓰던 execution-context contamination 문제를 진단했습니다. 복잡한 락 동기화를 도입하는 대신 루프 반복마다 독립적인 실행 컨텍스트와 고유 UUID를 생성해 전달하도록 단순화했습니다. 333행의 검증 테스트를 직접 작성하여 다중 인스턴스 환경에서도 상태 오염 없는 안전한 비동기 배치를 구현했습니다.

### 2.2 기술적·비즈니스적 제약 조건 (Constraints)
- **기존 비동기 스레드 풀 구조 유지**: 비동기 배치 실행 프레임워크와 스레드 풀 할당 정책을 전면 재작성하지 않고 문제를 해결해야 했습니다.
- **동시성 경합 상태 제거**: 다수의 테스트 인스턴스를 동시 실행할 때 이력 테이블(`TB_TST_EXECUTION_HIST`) 인서트 시 PK 충돌(`DuplicateKeyException`)이 발생하지 않아야 했습니다.

### 2.3 Failure Condition & Root Cause
- **Failure Condition**: `groupExecute`/`batchExecute`를 통해 여러 시험을 동시에 비동기 배치 실행할 때, 후속 iteration이 실행 컨텍스트를 덮어쓰며 이전 비동기 작업이 잘못된 식별자를 참조해 DB 인서트 중복 에러가 발생했습니다.
- **Root Cause**: 반복 루프 외부에 단일 `reqMap` 인스턴스를 선언하고, 각 iteration마다 `requestId`와 `instanceId` 값만 변경한 채 동일한 맵 참조(Reference)를 비동기 실행 스레드로 넘겨주어 데이터 레이스(Data Race)가 발생했습니다.

### 2.4 설계 결정 및 트레이드오프 (Trade-off & Decision)
- **선택한 방식**: 
  - 공유 가변 맵에 동기화 락(`synchronized` 또는 ConcurrentMap)을 적용하는 대신, 루프 반복 시마다 새로운 `HashMap`과 고유 UUID를 생성하여 비동기 실행 단위별로 메모리 컨텍스트를 완전 격리했습니다.
- **포기하거나 감수한 것**: 
  - 매 호출마다 독립적인 Map 객체와 UUID를 생성함에 따른 경미한 단기 메모리 할당(GC 압력)을 수용했습니다.
- **합리적이었던 이유**: 
  - 락 경합(Lock Contention)에 따른 배치 처리 속도 저하나 데드락 위험을 원천 배제하면서, 동시성 환경에서의 참조 공유 부수 효과(Side-effect)를 가장 명확하고 단순하게 차단할 수 있었습니다.

### 2.5 직접 구현한 범위 (Implementation Scope)
- **비동기 배치 서비스 코드 리팩터링**: 가변 맵 재사용 제거 및 인스턴스별 독립 실행 컨텍스트 생성
- **동시성 검증 테스트 스위트 작성**:
  - 각 인스턴스별 독립 맵 생성 여부 검증
  - 비동기 태스크 간 고유 `requestId` 및 올바른 `instanceId` 바인딩 검증
  - 빈 인스턴스 목록 입력 시 불필요한 비동기 호출 방지 검증
- **서비스 수정 및 약 333행의 신규 단위/동시성 테스트 작성 오너십 수행**

### 2.6 성과 지표 (KPI / SLO)
- **Actual**: 
  - 서비스 로직 격리 구현 및 333행 분량의 동시성/인스턴스 분리 단위 테스트 스위트 통과 (Jira Done).
- **Measurement Candidate (향후 계측 권장 지표)**:
  - 동시 배치 실행 시 DB `DuplicateKeyException` 발생 빈도 (프로덕션 런타임 추적 지표)
  - 동시 태스크 간 파라미터 오염 발생률 (0% 유지 여부)

### 2.7 남아 있는 운영 한계
- 공유 맵 덮어쓰기 결함은 코드 레벨과 단위 테스트로 확실히 입증·해결되었으나, 프로덕션 환경의 `DuplicateKeyException` 발생 원인이 오직 이 결함 단 하나뿐이었는지는 추가 런타임 트레이스 관측이 필요합니다.

---

## 3. Sub-second Metric Pipeline의 시간축 정합성 개선

### 메타데이터
- **Title (Primary)**: Sub-second Metric Pipeline의 시간축 정합성 개선
- **Subtitle (Secondary)**: Sub-Second Metric Timing and Normalization Pipeline
- **Stack**: Telegraf, Valkey, HTTP
- **One-liner**: 200ms 수집에서 발생한 sampling noise, 전달 지연, timestamp validity, browser scheduling을 서로 다른 시간축으로 분리했습니다. averaging window와 timestamp tolerance를 조정해 sub-second metric 처리 조건을 명확히 했습니다.

### 3.1 개요
200ms 단위의 초고빈도 메트릭 수집 환경에서 발생하는 순간적인 샘플링 변동성과 네트워크 전송 지체(약 900ms) 간의 시간축 정렬 문제를 해결했습니다. 단일 지연 문제로 보지 않고 샘플링 노이즈, 전송 지체, 타임스탬프 유효성 검증 충돌, 브라우저 백그라운드 스로틀링을 각각 분리하여 접근했습니다. Telegraf 50ms flush, 타임스탬프 허용 오차(±300ms) 보정, 슬라이딩 윈도우 평균 정규화를 통해 저지연 시계열 파이프라인을 튜닝하고 P99 53ms의 전송 성능을 도출했습니다.

### 3.2 기술적·비즈니스적 제약 조건 (Constraints)
- **200ms 초고빈도 수집 요구**: 초단위 미만의 실시간 모니터링 요구사항으로 인해 순간적인 CPU 부하 스파이크가 데이터 왜곡으로 이어질 위험이 높았습니다.
- **네트워크 및 배치 지연 한계**: 수신부터 배치 저장까지 발생하는 파이프라인 처리 시간(약 900ms)이 데이터의 타임스탬프 유효성 검증과 충돌했습니다.
- **클라이언트 제약**: 브라우저 백그라운드 탭 스로틀링으로 인해 프론트엔드의 차트 데이터 폴링 주기가 왜곡되는 환경을 완충해야 했습니다.

### 3.3 Failure Condition & Root Cause
- **Failure Condition**: 기존 Hubble 메트릭의 수집 신선도(Freshness)와 신뢰도가 저하되었으며, 1초 미만 주기에서 타임스탬프 유효성 검증 실패로 메트릭 유실이 발생했습니다.
- **Root Cause**: 200ms 단위의 순간 CPU 샘플링 변동성, Receive부터 Post/Batch 처리 및 네트워크 전송까지 걸리는 약 900ms의 시차, 24시간 히스토리 API의 과도한 반복 처리 비용이 결합되어 파이프라인 정체가 발생했습니다.

### 3.4 설계 결정 및 트레이드오프 (Trade-off & Decision)
- **선택한 방식**: 
  - 범용 Hubble 메트릭 대신 Telegraf → HTTP Post/Batch → Valkey 파이프라인을 구축했습니다.
  - Telegraf flush 간격을 50ms로 단축하고 `round_interval=false`를 지정하여 수집 지연을 최소화했습니다.
  - 타임스탬프 허용 오차(tolerance)를 ±300ms로 완화하고, 짧은 주기 샘플링 노이즈를 완충하기 위해 이동 평균 윈도우(Average Window)를 적용했습니다.
- **포기하거나 감수한 것**: 
  - 과거 24시간 이력 데이터의 실시간 반복 쿼리 비용을 감당하는 대신, 대시보드 표시에는 Current API 위주의 캐시 조회를 우선하도록 트레이드오프했습니다.
- **합리적이었던 이유**: 
  - 네트워크 지연과 수집 주기 불일치로 버려지던 초고빈도 메트릭의 유실을 방지하고, 단말의 일시적 스파이크 노이즈를 부드럽게 정규화하여 안정적인 관측성을 제공할 수 있었습니다.

### 3.5 직접 구현한 범위 (Implementation Scope)
- **메트릭 파이프라인 튜닝 및 버퍼링 설정**:
  - Telegraf 50ms flush 및 `round_interval=false` 설정
  - 타임스탬프 유효성 허용 오차(±300ms) 및 평균 윈도우(Average Window) 알고리즘 적용
  - 대시보드 부하 완화를 위한 Current API 조회 구조 조정 및 Valkey 연동 최적화
- *참고: 파이프라인 전체 컴포넌트 아키텍처를 단독 구축한 것이 아니며, 초고빈도 수집 노이즈 완충 및 전송 지연 보정 설정에 집중하여 기여했습니다.*

### 3.6 성과 지표 (KPI / SLO)
- **Actual**: 
  - 파이프라인 처리 지연 시간(Latency) 실측치: **P50 28ms, P95 51ms, P99 53ms** 달성.
- **Measurement Candidate (향후 계측 권장 지표)**:
  - 타임스탬프 허용 오차(±300ms) 초과로 인한 패킷 드랍율 (Drop Rate)
  - 초당 메트릭 인입 및 정규화 처리량 (Ingestion Throughput)

### 3.7 남아 있는 운영 한계
- 기록된 Percentile 수치는 특정 측정 구간에 기반한 결과이며, 전사적인 장기 프로덕션 환경에서의 전수 측정치는 추가 검증이 필요합니다.

---

## 4. Gen1 → Gen2 관제 데이터의 Semantic Compatibility 설계

### 메타데이터
- **Title (Primary)**: Gen1 → Gen2 관제 데이터의 Semantic Compatibility 설계
- **Subtitle (Secondary)**: Semantic Compatibility Adapter for Gen1-to-Gen2 Migration
- **Stack**: Go
- **One-liner**: Gen1의 version·step·result를 그대로 복사하지 않고 Gen2 의미 모델에 맞춰 명시적으로 매핑했습니다. 세대 차이를 converter 내부의 compatibility boundary로 캡슐화했습니다.

### 4.1 개요
차세대 관제 플랫폼으로 이기종 데이터를 전환하는 과정에서 미구현 분기로 인해 레거시 상태값이 유실되거나 왜곡될 수 있었던 문제를 해결했습니다. 세대 간 데이터를 단순 복사하지 않고, Gen1의 버전별(1.2/1.3) 리포트와 롤백·재시도 단계 코드를 Gen2 도메인 상수로 1:1 명시적 매핑(explicit mapping)하는 Go 어댑터를 구축했습니다. 이를 통해 다운스트림 관제 시스템이 복잡한 레거시 버전의 파편화에 종속되지 않고 일관된 호환성 경계(compatibility boundary)를 확보하도록 구현했습니다.

### 4.2 기술적·비즈니스적 제약 조건 (Constraints)
- **레거시 비정형 데이터 호환**: Gen1 시스템의 특수 보고서, 단계별 재시도/롤백, OTA 리셋 등 정형화되지 않은 분기 데이터를 완전하게 수용해야 했습니다.
- **컨슈머 무중단 보장**: 다운스트림 Gen2 시스템이 레거시 버전별 세부 코드의 파편화에 영향을 받지 않고 단일화된 코드 체계로 해석할 수 있어야 했습니다.

### 4.3 Failure Condition & Root Cause
- **Failure Condition**: 특정 special-report 및 step/retry/rollback/OTA reset 이벤트 데이터에서 Gen1의 세부 상태 의미가 Gen2 모델로 전달될 때 정확하게 보존되지 않거나 유실될 수 있었습니다.
- **Root Cause**: 기존 변환기(Converter)의 일부 1.2/1.3 브랜치가 비어 있거나 TODO 상태였으며, Gen1의 버전별 step/result 의미를 Gen2 코드 체계로 명시적 매핑(Explicit Mapping)하지 않고 원시값을 그대로 패스스루하려 했습니다.

### 4.4 설계 결정 및 트레이드오프 (Trade-off & Decision)
- **선택한 방식**: 
  - 레거시 원시값을 그대로 전달하는 암묵적 변환을 배제하고, Go 언어 기반으로 버전별(1.2/1.3) 결과 코드와 단계를 Gen2 도메인 상수로 1:1 전수 명시 매핑했습니다.
- **포기하거나 감수한 것**: 
  - Go 변환기 내부의 매핑 테이블 및 분기 상수 정의 코드 라인이 다소 증가(+165/-56 lines)했습니다.
- **합리적이었던 이유**: 
  - 다운스트림 컨슈머 측에서의 역직렬화 런타임 오류 및 데이터 의미 왜곡을 컴파일 타임과 어댑터 레이어에서 원천 차단할 수 있었습니다.

### 4.5 직접 구현한 범위 (Implementation Scope)
- **Go 기반 Semantic Converter 및 도메인 상수 확장**:
  - Gen1 1.2 및 1.3 버전 브랜치의 미구현(TODO) 변환 로직 완성
  - Step, Retry, Rollback, OTA Reset 관련 세부 결과 코드 전수 명시적 매핑
  - Go 코드베이스 +165 / -56 라인 변경 작성 및 Git 커밋/PR 주도 (Jira Done)

### 4.6 성과 지표 (KPI / SLO)
- **Actual**: 
  - Go 변환기 코드베이스 수정(+165/-56), 1.2/1.3 및 상세 단계별 분기 커버리지 확장 완료 (Jira Done).
- **Measurement Candidate (향후 계측 권장 지표)**:
  - Gen1 → Gen2 변환 시 미매핑 상태 코드 발생률 (Unmapped Code Rate: 0%)
  - 다운스트림 관제 컨슈머의 원격 제어 상태 불일치 리포트 건수

### 4.7 남아 있는 운영 한계
- 외부 컨슈머 측의 최종 수용 테스트(Acceptance Test) 결과와 장기 운영 데이터상의 의미 정확도 통계는 추가 관측이 필요합니다.
