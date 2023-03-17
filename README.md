# Hasura Base

1)
yarn dev:docker:start

2)
yarn dev:console
? yarn dev:migrate
? yarn dev:metadata

3)
yarn dev

4)
yarn dev:docker:stop

To update prisma schema after hasura db updates:

yarn prisma db pull
yarn prisma generate

Minio UI : http://localhost:9090/browser (minio, minosecret)
BullMQ UI : http://localhost:3000/admin/queues (admin, admin)

Prisma model types not updating?
Open databse.ts and remove import
import { PrismaClient } from '@prisma/client'
save, then restore import and save again

RequestTimeTooSkewed: The difference between the request time and the server's time is too large. => Stop containers, stop docker desktop, then restart all