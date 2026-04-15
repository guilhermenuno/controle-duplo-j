const {
  daysBetween,
  json,
  sendPatientNotification,
  supabaseFetch,
  todayDateString
} = require("./_notifications")

function isAuthorizedCron(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return true

  const header = request.headers.authorization || ""
  return header === `Bearer ${secret}`
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

module.exports = async function handler(request, response) {
  if (!isAuthorizedCron(request)) {
    json(response, 401, { error: "Cron não autorizado." })
    return
  }

  try {
    const today = todayDateString()
    const patients = await supabaseFetch(
      "/rest/v1/pacientes?data_retirada=is.null&status=eq.ativo&select=*"
    )

    const results = []

    for (const patient of patients) {
      const notificationTypes = notificationTypesForPatient(patient, today)

      for (const notificationType of notificationTypes) {
        const result = await sendPatientNotification(patient, notificationType)
        results.push({
          patientId: patient.id,
          notificationType,
          ...result
        })
      }
    }

    json(response, 200, {
      checked: patients.length,
      results
    })
  } catch (error) {
    json(response, 500, { error: error.message })
  }
}
