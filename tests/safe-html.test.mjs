import test from "node:test"
import assert from "node:assert/strict"

import { html, renderSafeHtml } from "../safe-html.mjs"

test("escapes text and attribute substitutions", () => {
  const attack = '\"><img src=x onerror="globalThis.pwned=true">'
  const rendered = renderSafeHtml(html`<button data-id="${attack}">${attack}</button>`)

  assert.equal(
    rendered,
    '<button data-id="&quot;&gt;&lt;img src=x onerror=&quot;globalThis.pwned=true&quot;&gt;">&quot;&gt;&lt;img src=x onerror=&quot;globalThis.pwned=true&quot;&gt;</button>'
  )
  assert.doesNotMatch(rendered, /<img/i)
})

test("allows only explicitly nested safe templates", () => {
  const badge = html`<span class="badge">${"Aprovado & ativo"}</span>`
  const rendered = renderSafeHtml(html`<div>${badge}</div>`)

  assert.equal(rendered, '<div><span class="badge">Aprovado &amp; ativo</span></div>')
})

test("rejects raw strings at the DOM sink", () => {
  assert.throws(
    () => renderSafeHtml("<img src=x onerror=alert(1)>") ,
    /SafeHtml/
  )
})
