-- Runs once, when the Postgres volume is first created.
-- The API connects as dopple_app: not a superuser and not the table owner,
-- so row-level security always applies to it.
create role dopple_app login password 'dopple_app';
grant connect on database dopple to dopple_app;
grant usage on schema public to dopple_app;
alter default privileges in schema public
  grant select, insert, update, delete on tables to dopple_app;
