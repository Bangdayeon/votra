# Infrastructure Layer

기술 구현 디테일이 사는 곳. 외부 시스템과 통신합니다.

- **db/** — Prisma, Drizzle 등 DB 클라이언트 & 스키마
- **repositories/** — application/ports 구현체
- **http/** — 외부 API 클라이언트
- **auth/** — 인증 어댑터

규칙
- application/domain 을 import 합니다. 반대 방향은 금지.
- 환경별로 구현이 갈리는 코드는 여기에 격리합니다.
