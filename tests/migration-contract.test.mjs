import test from "node:test"
import assert from "node:assert/strict"
import { readdir, readFile } from "node:fs/promises"

async function containmentMigration() {
  const migrationsUrl = new URL("../supabase/migrations/", import.meta.url)
  const files = await readdir(migrationsUrl)
  const name = files.find((file) => file.endsWith("_wave0_security_containment.sql"))

  assert.ok(name, "Wave 0 containment migration must exist")
  return readFile(new URL(name, migrationsUrl), "utf8")
}

test("migration removes all legacy permissive patient policies", async () => {
  const sql = await containmentMigration()
  const legacyPolicies = [
    "Usuarios autenticados podem ver pacientes",
    "Usuarios autenticados podem inserir pacientes",
    "Usuarios autenticados podem atualizar pacientes"
  ]

  for (const policy of legacyPolicies) {
    assert.match(sql, new RegExp(`drop policy if exists "${policy}"`, "i"))
    assert.doesNotMatch(sql, new RegExp(`create policy "${policy}"`, "i"))
  }
})

test("migration recreates explicit approved-user policies", async () => {
  const sql = await containmentMigration()

  for (const policy of [
    "pacientes_select_approved",
    "pacientes_insert_approved",
    "pacientes_update_approved",
    "pacientes_delete_admin_only"
  ]) {
    assert.match(sql, new RegExp(`create policy "${policy}"`, "i"))
  }

  assert.match(sql, /to authenticated/i)
  assert.match(sql, /\(select public\.is_approved_user\(\)\)/i)
  assert.match(sql, /\(select auth\.uid\(\)\)/i)
})

test("migration hardens function search paths and execution grants", async () => {
  const sql = await containmentMigration()

  for (const routine of [
    "handle_new_user",
    "is_admin_user",
    "is_approved_user",
    "set_updated_at"
  ]) {
    assert.match(
      sql,
      new RegExp(`alter function public\\.${routine}\\(\\) set search_path = ''`, "i")
    )
  }

  assert.match(sql, /revoke execute on function public\.handle_new_user\(\) from public, anon, authenticated/i)
  assert.match(sql, /grant execute on function public\.is_approved_user\(\) to authenticated/i)
})
