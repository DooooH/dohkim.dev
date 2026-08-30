---
title: 'Sub-second Metric Pipeline의 시간축 정합성 개선'
subtitle: 'Sub-Second Metric Timing and Normalization Pipeline'
description: '200ms 수집에서 발생한 sampling noise, 전달 지연, timestamp validity, browser scheduling을 서로 다른 시간축으로 분리했습니다. averaging window와 timestamp tolerance를 조정해 sub-second metric 처리 조건을 명확히 했습니다.'
tech:
  - Telegraf
  - Valkey
  - HTTP
order: 3
publishDate: 2026-02-01
---

## 개요

200ms 단위의 초고빈도 메트릭 수집 환경에서 발생하는 순간적인 샘플링 변동성과 네트워크 전송 지체(약 900ms) 간의 시간축 정렬 문제를 해결했습니다. 단일 지연 문제로 보지 않고 샘플링 노이즈, 전송 지체, 타임스탬프 유효성 검증 충돌, 브라우저 백그라운드 스로틀링을 각각 분리하여 접근했습니다. Telegraf 50ms flush, 타임스탬프 허용 오차(±300ms) 보정, 슬라이딩 윈도우 평균 정규화를 통해 저지연 시계열 파이프라인을 튜닝하고 P99 53ms의 전송 성능을 도출했습니다.

## 기술적·비즈니스적 제약 조건

- **200ms 초고빈도 수집 요구**: 초단위 미만의 실시간 모니터링 요구사항으로 인해 순간적인 CPU 부하 스파이크가 데이터 왜곡으로 이어질 위험이 높았습니다.
- **네트워크 및 배치 지연 한계**: 수신부터 배치 저장까지 발생하는 파이프라인 처리 시간(약 900ms)이 데이터의 타임스탬프 유효성 검증과 충돌했습니다.
- **클라이언트 제약**: 브라우저 백그라운드 탭 스로틀링으로 인해 프론트엔드의 차트 데이터 폴링 주기가 왜곡되는 환경을 완충해야 했습니다.

## Failure Condition & Root Cause

- **Failure Condition**: 기존 Hubble 메트릭의 수집 신선도(Freshness)와 신뢰도가 저하되었으며, 1초 미만 주기에서 타임스탬프 유효성 검증 실패로 메트릭 유실이 발생했습니다.
- **Root Cause**: 200ms 단위의 순간 CPU 샘플링 변동성, Receive부터 Post/Batch 처리 및 네트워크 전송까지 걸리는 약 900ms의 시차, 24시간 히스토리 API의 과도한 반복 처리 비용이 결합되어 파이프라인 정체가 발생했습니다.

## 설계 결정 및 트레이드오프 (Trade-off & Decision)

- **선택한 방식**: 
  - 범용 Hubble 메트릭 대신 Telegraf → HTTP Post/Batch → Valkey 파이프라인을 구축했습니다.
  - Telegraf flush 간격을 50ms로 단축하고 `round_interval=false`를 지정하여 수집 지연을 최소화했습니다.
  - 타임스탬프 허용 오차(tolerance)를 ±300ms로 완화하고, 짧은 주기 샘플링 노이즈를 완충하기 위해 이동 평균 윈도우(Average Window)를 적용했습니다.
- **포기하거나 감수한 것**: 
  - 과거 24시간 이력 데이터의 실시간 반복 쿼리 비용을 감당하는 대신, 대시보드 표시에는 Current API 위주의 캐시 조회를 우선하도록 트레이드오프했습니다.
- **합리적이었던 이유**: 
  - 네트워크 지연과 수집 주기 불일치로 버려지던 초고빈도 메트릭의 유실을 방지하고, 단말의 일시적 스파이크 노이즈를 부드럽게 정규화하여 안정적인 관측성을 제공할 수 있었습니다.

## 직접 구현한 범위 (Implementation Scope)

- **메트릭 파이프라인 튜닝 및 버퍼링 설정**:
  - Telegraf 50ms flush 및 `round_interval=false` 설정
  - 타임스탬프 유효성 허용 오차(±300ms) 및 평균 윈도우(Average Window) 알고리즘 적용
  - 대시보드 부하 완화를 위한 Current API 조회 구조 조정 및 Valkey 연동 최적화
- *참고: 파이프라인 전체 컴포넌트 아키텍처를 단독 구축한 것이 아니며, 초고빈도 수집 노이즈 완충 및 전송 지연 보정 설정에 집중하여 기여했습니다.*

## 성과 지표 (KPI / SLO)

- **Actual**: 
  - 파이프라인 처리 지연 시간(Latency) 실측치: **P50 28ms, P95 51ms, P99 53ms** 달성.
- **Measurement Candidate** *(향후 계측 권장 지표)*:
  - 타임스탬프 허용 오차(±300ms) 초과로 인한 패킷 드랍율 (Drop Rate)
  - 초당 메트릭 인입 및 정규화 처리량 (Ingestion Throughput)

## 남아 있는 운영 한계

- 기록된 Percentile 수치는 특정 측정 구간에 기반한 결과이며, 전사적인 장기 프로덕션 환경에서의 전수 측정치는 추가 검증이 필요합니다.
