FROM postgres:16-alpine

COPY supabase/migrations /migrations
COPY docker/migrations/run.sh /usr/local/bin/careersignal-migrate

RUN chmod 0555 /usr/local/bin/careersignal-migrate

ENTRYPOINT ["/usr/local/bin/careersignal-migrate"]
