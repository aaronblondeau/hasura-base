# Hasura Base

This is a starter project that uses Hasura, Prisma, Minio, BullMQ, and Maizzle.
Authentication is handled by Hasura and JWTs.

## Getting Started

1.  Install dependencies

```
yarn
```

2. Copy .env.example to .env and update values (note "TODO" values).  The S3 secret and key will be updated in step 4 below.

3. Start the docker containers

Before starting the containers, switch the postgres image to something like "postgis/postgis:15-3.3" in docker-compose.yml if you need PostGIS support.

```
yarn dev:docker:start
```

4. Use the minio UI (http://localhost:9090/) to create a 'user-public' bucket as well as to create an api access key and secret. Update S3_ACCESS_KEY and S3_SECRET_KEY in .env file.

5. Start the node.js server

```
yarn dev
```

6. Run hasura migrations and apply metadata

```
yarn dev:migrate
yarn dev:metadata
```

7. Start the hasura console

```
yarn dev:console
```

8. Use the hasura console to create additonal tables, actions, events, relationships, and permissions.

Other admin tools are available at (see .env file for passwords):

Minio UI : http://localhost:9090/
BullMQ UI : http://localhost:3000/admin/queues

9. To update prisma schema after hasura db updates:

```
yarn prisma db pull
yarn prisma generate
```

10. When done, stop the docker containers

```
yarn dev:docker:stop
```

## Email Templates

Emails templates are managed with [maizzle](https://maizzle.com/).

To develop email templates:

```
cd src/emails
yarn install
yarn dev
```

Once the dev server has started, go to http://localhost:3050/.  Updates to templates will live reload!

To build email templates

```
cd src/emails
yarn build
```

## Troubleshooting

Prisma model types not updating?
Open databse.ts and remove import
import { PrismaClient } from '@prisma/client'
save, then restore import and save again

RequestTimeTooSkewed: The difference between the request time and the server's time is too large. => Stop containers, stop docker desktop, then restart all
