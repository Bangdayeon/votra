# Infrastructure / DB

Prisma + PostgreSQL.

- **`prisma.ts`** — `PrismaClient` 싱글톤. Next.js dev HMR 에서 connection leak 방지 위해 `globalThis` 캐싱.
- 스키마: 프로젝트 루트의 `prisma/schema.prisma`
- 마이그레이션: `prisma/migrations/`

## 사용

```ts
import { prisma } from "@/infrastructure/db/prisma";

const users = await prisma.user.findMany();
```

## 스크립트

| 명령 | 용도 |
|---|---|
| `npm run db:generate` | `prisma/schema.prisma` 기반으로 client 재생성 |
| `npm run db:push` | 스키마를 DB 에 직접 반영 (마이그레이션 없이, 개발용) |
| `npm run db:migrate` | 개발 마이그레이션 생성 + 적용 |
| `npm run db:deploy` | 프로덕션에서 기존 마이그레이션만 적용 |
| `npm run db:studio` | Prisma Studio (DB GUI) |

`npm install` 후 `postinstall` 훅이 `prisma generate` 를 자동 실행하므로 axhub 빌드 컨테이너에서도 client 가 생성돼요.
