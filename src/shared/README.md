# Shared

레이어를 가로질러 쓰이는 순수 유틸/타입.

- **lib/** — 날짜·문자열·결과 타입 등 framework-agnostic 헬퍼
- **types/** — 전역 타입 정의

규칙
- 비즈니스 규칙은 두지 않습니다 (그건 domain).
- 다른 레이어 모듈을 import 하지 않습니다.
