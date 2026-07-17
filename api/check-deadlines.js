const { timingSafeEqual } = require("node:crypto")

const {
  daysBetween,
  json,
  sendPatientNotification,
  supabaseFetch,
  todayDateString
} = require("./_notifications")

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)

  if (leftBuffer.length !== rightBuffer.length) return false
  return timingSafeEqual(leftBuffer, rightBuffer)
}

function isAuthorizedCron(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false

  const header = request.headers?.authorization || ""
  return constantTimeEqual(header, `Bearer ${secret}`)
}

function notificationTypesForPatient(patient, today) {
  const types = []
  const prazo = patient.data_prazo_retirada || patient.data_3_meses
  const daysToDeadline = daysBetween(today, prazo)

  if (daysToDeadline >= 0 && daysToDeadline <= 15) {
    types.push("proximo_prazo")
  }

  if (daysToDeadline < 0) {
    types.push("prazo_atingido")
  }

  if (patient.data_6_meses && daysBetween(today, patient.data_6_meses) < 0) {
    types.push("maior_6_meses")
  }

  return types
}

async function handler(request, response) {
  if (!isAuthorizedCron(request)) {
    json(response, 401, { error: "Cron não autorizado." })
    return
  }

  try {
    const today = todayDateString()
    const patients = await supabaseFetch(
      "/rest/v1/pacientes?data_retirada=is.null&status=eq.ativo&select=*"
    )

    const summary = {
      checked: patients.length,
      notifications: 0,
      sent: 0,
      skipped: 0
    }

    for (const patient of patients) {
      const notificationTypes = notificationTypesForPatient(patient, today)

      for (const notificationType of notificationTypes) {
        const result = await sendPatientNotification(patient, notificationType)
        summary.notifications++
        summary.sent += result.sent || 0
        if (!result.sent) summary.skipped++
      }
    }

    json(response, 200, summary)
  } catch (error) {
    console.error("Deadline notification check failed", { name: error.name })
    json(response, 500, { error: "Falha interna ao verificar prazos." })
  }
}

module.exports = handler
module.exports.isAuthorizedCron = isAuthorizedCron
