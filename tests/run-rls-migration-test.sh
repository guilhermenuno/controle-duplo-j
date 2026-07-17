#!/usr/bin/env bash
set -euo pipefail

container_name="controle-duplo-j-wave0-rls-test"
postgres_image="public.ecr.aws/supabase/postgres:17.6.1.143"

if docker container inspect "$container_name" >/dev/null 2>&1; then
  echo "Refusing to reuse an existing container named $container_name" >&2
  exit 1
fi

cleanup() {
  docker stop "$container_name" >/dev/null 2>&1 || true
  for _ in $(seq 1 20); do
    if ! docker container inspect "$container_name" >/dev/null 2>&1; then
      return
    fi
    sleep 1
  done
}
trap cleanup EXIT

docker run --rm --detach \
  --name "$container_name" \
  --env POSTGRES_PASSWORD=wave0-local-only \
  "$postgres_image" >/dev/null

for _ in $(seq 1 45); do
  if docker exec "$container_name" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

docker exec "$container_name" pg_isready -U postgres >/dev/null
sleep 12
docker exec "$container_name" pg_isready -U postgres >/dev/null
docker exec "$container_name" createdb -U postgres wave0_test
docker exec -i "$container_name" psql -v ON_ERROR_STOP=1 -U postgres -d wave0_test < tests/rls-before-wave0.sql
docker exec -i "$container_name" psql -v ON_ERROR_STOP=1 -U postgres -d wave0_test < supabase/migrations/20260717180000_wave0_security_containment.sql
docker exec -i "$container_name" psql -v ON_ERROR_STOP=1 -U postgres -d wave0_test < tests/rls-after-wave0.sql

echo "RLS integration test passed"
