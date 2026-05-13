# Application Layer

유스케이스(use case) 가 사는 곳. 도메인을 오케스트레이션해서 한 가지 일을 수행합니다.

- **use-cases/** — `CreateOrder`, `RegisterUser` 같은 한 가지 시나리오
- **ports/** — 인프라가 구현해야 할 인터페이스 (예: `UserRepository`)
- **dto/** — 입출력 데이터 구조

규칙
- 도메인은 import 가능. 인프라 구현체는 import 하지 말고 ports 인터페이스에만 의존합니다.
- 트랜잭션 경계는 여기서 그립니다.
