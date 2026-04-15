const {
  json,
  loadPatient,
  sendPatientNotification,
  verifyApprovedUser
} = require("./_notifications")

function getBody(request) {
  if (!request.body) return {}
  if (typeof request.body === "string") return JSON.parse(request.body)
  return request.body
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") {
    response.statusCode = 204
    response.end()
    return
  }

  if (request.method !== "POST") {
    json(response, 405, { error: "Método não permitido." })
    return
  }

  try {
    const accessToken = request.headers.authorization?.replace(/^Bearer\s+/i, "")
    if (!accessToken || !(await verifyApprovedUser(accessToken))) {
      json(response, 401, { error: "Usuário não autorizado." })
      return
    }

    const { patientId, notificationType } = getBody(request)
    if (!patientId || !notificationType) {
      json(response, 400, { error: "Informe patientId e notificationType." })
      return
    }

    const patient = await loadPatient(patientId)
    if (!patient) {
      json(response, 404, { error: "Paciente não encontrado." })
      return
    }

    const result = await sendPatientNotification(patient, notificationType)
    json(response, 200, result)
  } catch (error) {
    json(response, 500, { error: error.message })
  }
}
