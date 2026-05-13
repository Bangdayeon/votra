# votra

Next.js 15 · React 19 · Tailwind v4 · TypeScript · light DDD

## Setup

```bash
npm install
npm run dev
```

## Scripts

- `dev` — 개발 서버
- `build` — 프로덕션 빌드
- `start` — 빌드 결과 실행
- `lint` / `lint:fix` — ESLint (next/core-web-vitals + typescript + prettier)
- `format` / `format:check` — Prettier (+ tailwindcss class 정렬 플러그인)
- `typecheck` — `tsc --noEmit`

## Folder layout (light DDD)

```
src/
├── app/             # Next.js App Router (presentation)
├── domain/          # entities, value-objects, events, errors
├── application/     # use-cases, ports, dto
├── infrastructure/  # db, repositories, http, auth
└── shared/          # framework-agnostic utils & types
```

의존 방향:

```
app  ──▶  application  ──▶  domain
              ▲
infrastructure ┘   (ports 인터페이스 구현)
```

shared 는 어디서나 import 가능하지만 어떤 레이어도 import 하지 않습니다.

## Path aliases

```ts
import { Result } from "@shared/lib/result";
// "@/*", "@app/*", "@domain/*", "@application/*", "@infrastructure/*", "@shared/*"
```
