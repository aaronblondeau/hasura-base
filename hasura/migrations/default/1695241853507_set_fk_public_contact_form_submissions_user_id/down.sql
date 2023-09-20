alter table "public"."contact_form_submissions" drop constraint "contact_form_submissions_user_id_fkey",
  add constraint "contact_form_submissions_user_id_fkey"
  foreign key ("user_id")
  references "public"."users"
  ("id") on update cascade on delete no action;
