#!/bin/sh
set -eu

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL is required}"

psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS public.careersignal_schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

supabase_ledger="$(psql "$SUPABASE_DB_URL" --tuples-only --no-align --set=ON_ERROR_STOP=1 \
  --command="SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL")"

supabase_has_name="false"
supabase_has_statements="false"
if [ "$supabase_ledger" = "t" ]; then
  supabase_has_name="$(psql "$SUPABASE_DB_URL" --tuples-only --no-align --set=ON_ERROR_STOP=1 \
    --command="SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations' AND column_name = 'name')")"
  supabase_has_statements="$(psql "$SUPABASE_DB_URL" --tuples-only --no-align --set=ON_ERROR_STOP=1 \
    --command="SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'supabase_migrations' AND table_name = 'schema_migrations' AND column_name = 'statements')")"
fi

for migration in /migrations/*.sql; do
  version="$(basename "$migration")"
  case "$version" in
    *[!A-Za-z0-9_.-]*)
      echo "Invalid migration filename: $version" >&2
      exit 1
      ;;
  esac

  migration_id="${version%.sql}"
  migration_version="${migration_id%%_*}"
  migration_name="${migration_id#*_}"

  applied="$(psql "$SUPABASE_DB_URL" --tuples-only --no-align --set=ON_ERROR_STOP=1 \
    --command="SELECT 1 FROM public.careersignal_schema_migrations WHERE version = '$version'")"

  # Existing Supabase projects already track migrations in the CLI ledger.
  # Mirror that state into our container ledger instead of replaying SQL.
  if [ -z "$applied" ] && [ "$supabase_ledger" = "t" ]; then
    applied_in_supabase="$(psql "$SUPABASE_DB_URL" --tuples-only --no-align --set=ON_ERROR_STOP=1 \
      --command="SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = '$migration_version'")"
    if [ "$applied_in_supabase" = "1" ]; then
      psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 \
        --command="INSERT INTO public.careersignal_schema_migrations (version) VALUES ('$version') ON CONFLICT DO NOTHING" >/dev/null
      applied="1"
    fi
  fi

  if [ "$applied" = "1" ]; then
    echo "Skipping already applied migration: $version"
    continue
  fi

  echo "Applying migration: $version"
  psql "$SUPABASE_DB_URL" --single-transaction --set=ON_ERROR_STOP=1 --file="$migration"
  psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 \
    --command="INSERT INTO public.careersignal_schema_migrations (version) VALUES ('$version')"

  # Keep Supabase CLI migration history compatible with migrations applied by
  # this container so a later `supabase db push` will not replay them.
  if [ "$supabase_ledger" = "t" ]; then
    if [ "$supabase_has_name" = "t" ] && [ "$supabase_has_statements" = "t" ]; then
      ledger_sql="INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES ('$migration_version', '$migration_name', ARRAY[]::text[]) ON CONFLICT (version) DO NOTHING"
    elif [ "$supabase_has_name" = "t" ]; then
      ledger_sql="INSERT INTO supabase_migrations.schema_migrations (version, name) VALUES ('$migration_version', '$migration_name') ON CONFLICT (version) DO NOTHING"
    elif [ "$supabase_has_statements" = "t" ]; then
      ledger_sql="INSERT INTO supabase_migrations.schema_migrations (version, statements) VALUES ('$migration_version', ARRAY[]::text[]) ON CONFLICT (version) DO NOTHING"
    else
      ledger_sql="INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('$migration_version') ON CONFLICT (version) DO NOTHING"
    fi
    psql "$SUPABASE_DB_URL" --set=ON_ERROR_STOP=1 --command="$ledger_sql" >/dev/null
  fi
done

echo "All CareerSignal migrations are applied."
