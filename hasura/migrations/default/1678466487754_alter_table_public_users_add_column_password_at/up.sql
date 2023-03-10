alter table "public"."users" add column "password_at" timestamptz
 not null default now();
