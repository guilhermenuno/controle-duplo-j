import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"

test("app has a single guarded innerHTML sink", async () => {
  const source = await readFile(new URL("../app.js", import.meta.url), "utf8")
  const sinks = source.match(/\.innerHTML\s*=/g) || []

  assert.equal(sinks.length, 1)
  assert.match(source, /card\.innerHTML\s*=\s*renderSafeHtml\(content\)/)
})

test("deadline API never returns patient identifiers", async () => {
  const source = await readFile(
    new URL("../api/check-deadlines.js", import.meta.url),
    "utf8"
  )

  assert.doesNotMatch(source, /patientId\s*:/)
  assert.doesNotMatch(source, /error:\s*error\.message/)
})
