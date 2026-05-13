# Domain Layer

도메인 핵심 규칙이 사는 곳. 외부 의존성 없는 순수 모델만 둡니다.

- **entities/** — 식별자를 가지고 생애주기를 가지는 객체 (예: `User`, `Order`)
- **value-objects/** — 식별자 없는 불변값 (예: `Email`, `Money`)
- **events/** — 도메인 이벤트 (예: `OrderPlaced`)
- **errors/** — 도메인 규칙 위반을 나타내는 예외 타입

규칙
- React, Next.js, DB, fetch 등 어떤 외부 모듈도 import 하지 않습니다.
- 다른 레이어에서 의존하지만, 다른 레이어를 의존하지 않습니다.
