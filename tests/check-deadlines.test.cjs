const test = require("node:test")
const assert = require("node:assert/strict")

const checkDeadlines = require("../api/check-deadlines")

function request(authorization) {
  return { headers: authorization ? { authorization } : {} }
}

function response() {
  return {
    body: undefined,
    headers: {},
    statusCode: undefined,
    setHeader(name, value) {
      this.headers[name] = value
    },
    end(body) {
      this.body = JSON.parse(body)
    }
  }
}

test("cron fails closed when CRON_SECRET is absent", () => {
  const previous = process.env.CRON_SECRET
  delete process.env.CRON_SECRET

  try {
    assert.equal(checkDeadlines.isAuthorizedCron(request()), false)
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})

test("cron handler returns 401 before any database access when secret is absent", async () => {
  const previous = process.env.CRON_SECRET
  delete process.env.CRON_SECRET
  const result = response()

  try {
    await checkDeadlines(request(), result)
    assert.equal(result.statusCode, 401)
    assert.deepEqual(result.body, { error: "Cron não autorizado." })
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})

test("cron rejects missing and incorrect bearer tokens", () => {
  const previous = process.env.CRON_SECRET
  process.env.CRON_SECRET = "wave-0-secret"

  try {
    assert.equal(checkDeadlines.isAuthorizedCron(request()), false)
    assert.equal(checkDeadlines.isAuthorizedCron(request("Bearer wrong")), false)
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})

test("cron accepts only the exact bearer token", () => {
  const previous = process.env.CRON_SECRET
  process.env.CRON_SECRET = "wave-0-secret"

  try {
    assert.equal(
      checkDeadlines.isAuthorizedCron(request("Bearer wave-0-secret")),
      true
    )
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})
