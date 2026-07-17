const safeHtmlBrand = Symbol("SafeHtml")
const htmlEntities = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => htmlEntities[character])
}

function isSafeHtml(value) {
  return Boolean(value && value[safeHtmlBrand] === true)
}

export function html(strings, ...values) {
  let value = strings[0]

  values.forEach((item, index) => {
    value += isSafeHtml(item) ? item.value : escapeHtml(item)
    value += strings[index + 1]
  })

  return Object.freeze({ [safeHtmlBrand]: true, value })
}

export function renderSafeHtml(value) {
  if (!isSafeHtml(value)) {
    throw new TypeError("Expected a SafeHtml template")
  }

  return value.value
}
