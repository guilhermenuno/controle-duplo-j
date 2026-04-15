const NOTIFICATION_MESSAGES = {
  cadastro:
    "Olá, este é um aviso do serviço de Urologia. Seu cadastro para acompanhamento do cateter duplo J foi registrado. Em caso de dúvidas, procure o serviço responsável.",
  proximo_prazo:
    "Olá, este é um aviso do serviço de Urologia. Seu acompanhamento do cateter duplo J está próximo do prazo previsto. Procure o serviço responsável para orientação.",
  prazo_atingido:
    "Olá, este é um aviso do serviço de Urologia. O prazo previsto para acompanhamento/retirada do cateter duplo J foi atingido. Procure o serviço responsável.",
  maior_6_meses:
    "Olá, este é um aviso do serviço de Urologia. Consta acompanhamento de cateter duplo J há mais de 6 meses. Procure o serviço responsável para avaliação."
}

const DEFAULT_SUPABASE_URL = "https://forbdpfbuuwbqcwvscjq.supabase.co"

function getEnv(name) {
  if (name === "SUPABASE_URL") {
    return process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL
  }

  const value = process.env[name]
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`)
  return value
}

function getSupabaseServiceKey() {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
  if (!value) {
    throw new Error("Variável de ambiente ausente: SUPABASE_SERVICE_ROLE_KEY. Adicione a service_role key no projeto controle-duplo-j da Vercel e faça redeploy.")
  }
  return value
}

function json(response, status, data) {
  response.statusCode = status
  response.setHeader("Content-Type", "application/json")
  response.end(JSON.stringify(data))
}

function normalizePhone(phone) {
  if (!phone) return ""
  const clean = String(phone).replace(/[^\d+]/g, "")
  if (clean.startsWith("+")) return clean
  if (clean.startsWith("55")) return `+${clean}`
  return `+55${clean}`
}

function todayDateString() {
  return new Date().toISOString().split("T")[0]
}

function daysBetween(startDate, endDate) {
  const start = new Date(`${startDate}T12:00:00Z`)
  const end = new Date(`${endDate}T12:00:00Z`)
  return Math.round((end - start) / 86400000)
}

function basicAuth(accountSid, authToken) {
  return Buffer.from(`${accountSid}:${authToken}`).toString("base64")
}

async function supabaseFetch(path, options = {}) {
  const url = `${getEnv("SUPABASE_URL").replace(/\/$/, "")}${path}`
  const serviceKey = getSupabaseServiceKey()

  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    throw new Error(data?.message || data?.error_description || data?.hint || response.statusText)
  }

  return data
}

async function verifyApprovedUser(accessToken) {
  const userResponse = await fetch(`${getEnv("SUPABASE_URL").replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: getSupabaseServiceKey(),
      Authorization: `Bearer ${accessToken}`
    }
  })

  const user = await userResponse.json().catch(() => null)
  if (!userResponse.ok || !user?.id) return null

  const profiles = await supabaseFetch(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&approved=eq.true&is_active=eq.true&select=id,role`
  )

  return profiles?.[0] ? user : null
}

async function loadPatient(patientId) {
  const rows = await supabaseFetch(
    `/rest/v1/pacientes?id=eq.${encodeURIComponent(patientId)}&select=*`
  )
  return rows?.[0] || null
}

async function notificationAlreadySent(patientId, notificationType, channel) {
  const rows = await supabaseFetch(
    `/rest/v1/patient_notifications?patient_id=eq.${encodeURIComponent(patientId)}&notification_type=eq.${encodeURIComponent(notificationType)}&channel=eq.${encodeURIComponent(channel)}&status=eq.sent&select=id`
  )
  return rows.length > 0
}

async function logNotification({ patientId, notificationType, channel, destination, status, errorMessage }) {
  await supabaseFetch("/rest/v1/patient_notifications", {
    method: "POST",
    body: JSON.stringify([
      {
        patient_id: patientId,
        target_table: "pacientes",
        notification_type: notificationType,
        channel,
        destination,
        status,
        error_message: errorMessage || null,
        sent_at: status === "sent" ? new Date().toISOString() : null
      }
    ])
  })
}

async function sendTwilioMessage({ to, channel, body }) {
  const accountSid = getEnv("TWILIO_ACCOUNT_SID")
  const form = new URLSearchParams()
  form.set("To", channel === "whatsapp" ? `whatsapp:${to}` : to)
  form.set("Body", body)

  if (channel === "whatsapp") {
    form.set("From", getEnv("TWILIO_WHATSAPP_FROM"))
  } else {
    form.set("MessagingServiceSid", getEnv("TWILIO_MESSAGING_SERVICE_SID"))
  }

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth(accountSid, getEnv("TWILIO_AUTH_TOKEN"))}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.message || response.statusText)
  }

  return data
}

async function sendPatientNotification(patient, notificationType) {
  const body = NOTIFICATION_MESSAGES[notificationType]
  if (!body) throw new Error("Tipo de notificação inválido.")

  const phone = normalizePhone(patient.telefone)
  if (!phone) {
    return { sent: 0, channels: [], skipped: "telefone ausente" }
  }

  const channelConfigs = [
    { channel: "sms", allowed: patient.contato_sms_autorizado },
    { channel: "whatsapp", allowed: patient.contato_whatsapp_autorizado }
  ]

  const results = []

  for (const config of channelConfigs) {
    if (!config.allowed) continue
    if (await notificationAlreadySent(patient.id, notificationType, config.channel)) continue

    try {
      await sendTwilioMessage({
        to: phone,
        channel: config.channel,
        body
      })
      await logNotification({
        patientId: patient.id,
        notificationType,
        channel: config.channel,
        destination: phone,
        status: "sent"
      })
      results.push(config.channel)
    } catch (error) {
      await logNotification({
        patientId: patient.id,
        notificationType,
        channel: config.channel,
        destination: phone,
        status: "error",
        errorMessage: error.message
      })
    }
  }

  if (!results.length) {
    const skipped = patient.contato_sms_autorizado || patient.contato_whatsapp_autorizado
      ? "mensagem já enviada anteriormente ou erro registrado"
      : "paciente sem autorização para SMS/WhatsApp"

    return { sent: 0, channels: [], skipped }
  }

  return { sent: results.length, channels: results }
}

module.exports = {
  daysBetween,
  json,
  loadPatient,
  sendPatientNotification,
  supabaseFetch,
  todayDateString,
  verifyApprovedUser
}
