// TODO - exception wrapper for action controller routes
// TODO - password_at & check in auth

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

Then:
??? yarn prisma generate


Prisma model types not updating?
Open databse.ts and remove import
import { PrismaClient } from '@prisma/client'
save, then restore import and save again
