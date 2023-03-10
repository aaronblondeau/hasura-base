// User profile pic via minio (pic gets cleanup up on user destroy / pic change, pic is publicly accessible)

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


Prisma model types not updating?
Open databse.ts and remove import
import { PrismaClient } from '@prisma/client'
save, then restore import and save again
