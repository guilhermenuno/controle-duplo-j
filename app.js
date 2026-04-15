import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabaseUrl = "https://forbdpfbuuwbqcwvscjq.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcmJkcGZidXV3YnFjd3ZzY2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzcwMjYsImV4cCI6MjA4ODg1MzAyNn0.fHgxkQlWjjss7DC3lL27EE6n7LWQQ0Ly3eQ_6YQRqEM"

const supabase = createClient(supabaseUrl, supabaseKey)

const state = {
  securityReady: true,
  currentUser: null,
  currentProfile: null,
  profilesMap: new Map(),
  activeSection: "dashboard",
  metrics: {
    ativos: 0,
    vencidos: 0,
    imagem: 0,
    retirados: 0,
    trocas: 0,
    trocasProximas: 0,
    trocasAtrasadas: 0
  }
}

const authView = document.getElementById("authView")
const appView = document.getElementById("appView")
const loginPanel = document.getElementById("loginPanel")
const cadastroPanel = document.getElementById("cadastroPanel")
const pendingPanel = document.getElementById("pendingPanel")
const setupPanel = document.getElementById("setupPanel")

const tabLogin = document.getElementById("tabLogin")
const tabCadastro = document.getElementById("tabCadastro")
const navCadastroRetirada = document.getElementById("navCadastroRetirada")
const navListaRetirada = document.getElementById("navListaRetirada")
const navHistoricoRetirada = document.getElementById("navHistoricoRetirada")
const navCadastroTroca = document.getElementById("navCadastroTroca")
const navListaTroca = document.getElementById("navListaTroca")
const navAcesso = document.getElementById("navAcesso")
const toggleSidebar = document.getElementById("toggleSidebar")

const dashboardSection = document.getElementById("dashboardSection")
const cadastroRetiradaSection = document.getElementById("cadastroRetiradaSection")
const listaRetiradaSection = document.getElementById("listaRetiradaSection")
const historicoRetiradaSection = document.getElementById("historicoRetiradaSection")
const cadastroTrocaSection = document.getElementById("cadastroTrocaSection")
const listaTrocaSection = document.getElementById("listaTrocaSection")
const acessoSection = document.getElementById("acessoSection")

const btnLogin = document.getElementById("login")
const btnLogout = document.getElementById("logout")
const btnLogoutPending = document.getElementById("logoutPending")
const btnSolicitarAcesso = document.getElementById("solicitarAcesso")
const btnCarregar = document.getElementById("carregar")
const btnExportarCsv = document.getElementById("exportarCsv")
const btnSalvarPaciente = document.getElementById("salvarPaciente")
const btnCancelarEdicaoPaciente = document.getElementById("cancelarEdicaoPaciente")
const btnSalvarTroca = document.getElementById("salvarTroca")
const btnCancelarEdicaoTroca = document.getElementById("cancelarEdicaoTroca")

const mensagemLogin = document.getElementById("mensagem")
const mensagemCadastroAcesso = document.getElementById("mensagemCadastroAcesso")
const mensagemCadastro = document.getElementById("mensagemCadastro")
const mensagemTroca = document.getElementById("mensagemTroca")
const mensagemSistema = document.getElementById("mensagemSistema")

const statusSessao = document.getElementById("statusSessao")
const usuarioLogado = document.getElementById("usuarioLogado")
const perfilUsuario = document.getElementById("perfilUsuario")
const pageTitle = document.getElementById("pageTitle")

const campoBusca = document.getElementById("busca")
const totalPacientes = document.getElementById("totalPacientes")
const totalVencidos = document.getElementById("totalVencidos")
const totalImagem = document.getElementById("totalImagem")
const totalRetirados = document.getElementById("totalRetirados")
const totalTrocas = document.getElementById("totalTrocas")
const totalTrocasProximas = document.getElementById("totalTrocasProximas")
const totalTrocasAtrasadas = document.getElementById("totalTrocasAtrasadas")

const listaPrazo = document.getElementById("listaPrazo")
const listaVencidos = document.getElementById("listaVencidos")
const listaImagem = document.getElementById("listaImagem")
const listaRetirados = document.getElementById("listaRetirados")
const listaTrocaAtrasada = document.getElementById("listaTrocaAtrasada")
const listaTrocaProxima = document.getElementById("listaTrocaProxima")
const listaTrocaPrazo = document.getElementById("listaTrocaPrazo")
const listaAprovacoes = document.getElementById("listaAprovacoes")

const pacienteFormTitulo = document.getElementById("pacienteFormTitulo")
const trocaFormTitulo = document.getElementById("trocaFormTitulo")

const camposProtegidos = [
  campoBusca,
  btnCarregar,
  btnExportarCsv,
  btnSalvarPaciente,
  btnSalvarTroca,
  document.getElementById("nome"),
  document.getElementById("registro"),
  document.getElementById("telefone"),
  document.getElementById("contatoSmsAutorizado"),
  document.getElementById("contatoWhatsappAutorizado"),
  document.getElementById("sexo"),
  document.getElementById("dataColocacao"),
  document.getElementById("prazoRetiradaMeses"),
  document.getElementById("prazoRetiradaDias"),
  document.getElementById("observacoes"),
  document.getElementById("trocaNome"),
  document.getElementById("trocaRegistro"),
  document.getElementById("trocaTelefone"),
  document.getElementById("trocaUltimaData"),
  document.getElementById("trocaIntervaloMeses"),
  document.getElementById("trocaIntervaloDias"),
  document.getElementById("trocaObservacoes")
]

function createCard(className, html, tagName = "article") {
  const card = document.createElement(tagName)
  card.className = className
  card.innerHTML = html
  return card
}

function setText(node, value) {
  node.innerText = value
}

function formatDate(dateValue) {
  if (!dateValue) return "-"
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(dateValue + "T12:00:00"))
}

function formatDateTime(dateValue) {
  if (!dateValue) return "-"
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(dateValue))
}

function slugDate() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, "0")
  const dia = String(agora.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function csvEscape(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`
}

function downloadCsv(name, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function addMonthsAndDays(dateString, months, days) {
  const date = new Date(dateString + "T12:00:00")
  date.setMonth(date.getMonth() + Number(months || 0))
  date.setDate(date.getDate() + Number(days || 0))
  return date.toISOString().split("T")[0]
}

function actorName(userId) {
  if (!userId) return "-"
  return state.profilesMap.get(userId) || userId
}

function isAdmin() {
  return state.currentProfile?.role === "admin"
}

function setAuthTab(tab) {
  const isLogin = tab === "login"
  tabLogin.classList.toggle("is-active", isLogin)
  tabCadastro.classList.toggle("is-active", !isLogin)
  loginPanel.classList.toggle("is-hidden", !isLogin)
  cadastroPanel.classList.toggle("is-hidden", isLogin)
  pendingPanel.classList.add("is-hidden")
}

function setActiveSection(section) {
  if (section === "acesso" && state.currentProfile?.role !== "admin") {
    section = "dashboard"
  }

  state.activeSection = section

  const pages = {
    dashboard: dashboardSection,
    "cadastro-retirada": cadastroRetiradaSection,
    "lista-retirada": listaRetiradaSection,
    "historico-retirada": historicoRetiradaSection,
    "cadastro-troca": cadastroTrocaSection,
    "lista-troca": listaTrocaSection,
    acesso: acessoSection
  }

  Object.entries(pages).forEach(([key, node]) => {
    node.classList.toggle("is-hidden", key !== section)
  })

  const navMap = {
    "cadastro-retirada": navCadastroRetirada,
    "lista-retirada": navListaRetirada,
    "historico-retirada": navHistoricoRetirada,
    "cadastro-troca": navCadastroTroca,
    "lista-troca": navListaTroca,
    acesso: navAcesso
  }

  Object.entries(navMap).forEach(([key, node]) => {
    node.classList.toggle("is-active", key === section)
  })

  const titles = {
    dashboard: "Visão geral",
    "cadastro-retirada": "Cadastro de retirada",
    "lista-retirada": "Pacientes em acompanhamento",
    "historico-retirada": "Histórico de retirados",
    "cadastro-troca": "Cadastro de trocas periódicas",
    "lista-troca": "Lista de trocas programadas",
    acesso: "Gestão de acesso"
  }

  setText(pageTitle, titles[section] || "Controle de Duplo J")
  applySearch()
}

function toggleSection(section) {
  if (state.activeSection === section) {
    setActiveSection("dashboard")
    return
  }

  setActiveSection(section)
}

function clearLists() {
  ;[
    listaPrazo,
    listaVencidos,
    listaImagem,
    listaRetirados,
    listaTrocaAtrasada,
    listaTrocaProxima,
    listaTrocaPrazo,
    listaAprovacoes
  ].forEach((list) => {
    list.innerHTML = ""
  })
}

function updateDashboard() {
  setText(totalPacientes, state.metrics.ativos)
  setText(totalVencidos, state.metrics.vencidos)
  setText(totalImagem, state.metrics.imagem)
  setText(totalRetirados, state.metrics.retirados)
  setText(totalTrocas, state.metrics.trocas)
  setText(totalTrocasProximas, state.metrics.trocasProximas)
  setText(totalTrocasAtrasadas, state.metrics.trocasAtrasadas)
}

function setProtectedDisabled(disabled) {
  camposProtegidos.forEach((field) => {
    field.disabled = disabled
  })
}

function showOnlyAuth() {
  authView.classList.remove("is-hidden")
  appView.classList.add("is-hidden")
}

function showOnlyApp() {
  authView.classList.add("is-hidden")
  appView.classList.remove("is-hidden")
}

function closeSidebarIfNeeded() {
  if (window.innerWidth <= 1120) {
    appView.classList.add("sidebar-collapsed")
    toggleSidebar.setAttribute("aria-expanded", "false")
  }
}

function showPendingAccess() {
  showOnlyAuth()
  loginPanel.classList.add("is-hidden")
  cadastroPanel.classList.add("is-hidden")
  pendingPanel.classList.remove("is-hidden")
  setupPanel.classList.add("is-hidden")
}

function showSetupRequired(message) {
  showOnlyAuth()
  loginPanel.classList.add("is-hidden")
  cadastroPanel.classList.add("is-hidden")
  pendingPanel.classList.add("is-hidden")
  setupPanel.classList.remove("is-hidden")
  mensagemLogin.innerText = message
}

function showLoginPanels() {
  showOnlyAuth()
  pendingPanel.classList.add("is-hidden")
  setupPanel.classList.add("is-hidden")
  setAuthTab("login")
}

function resetTrocaForm() {
  document.getElementById("trocaId").value = ""
  document.getElementById("trocaNome").value = ""
  document.getElementById("trocaRegistro").value = ""
  document.getElementById("trocaTelefone").value = ""
  document.getElementById("trocaUltimaData").value = ""
  document.getElementById("trocaIntervaloMeses").value = "3"
  document.getElementById("trocaIntervaloDias").value = "0"
  document.getElementById("trocaObservacoes").value = ""
  trocaFormTitulo.innerText = "Novo paciente de troca periódica"
  btnCancelarEdicaoTroca.classList.add("is-hidden")
  mensagemTroca.innerText = ""
}

function resetPacienteForm() {
  document.getElementById("pacienteId").value = ""
  document.getElementById("nome").value = ""
  document.getElementById("registro").value = ""
  document.getElementById("telefone").value = ""
  document.getElementById("contatoSmsAutorizado").checked = false
  document.getElementById("contatoWhatsappAutorizado").checked = false
  document.getElementById("sexo").value = ""
  document.getElementById("dataColocacao").value = ""
  document.getElementById("prazoRetiradaMeses").value = "3"
  document.getElementById("prazoRetiradaDias").value = "0"
  document.getElementById("observacoes").value = ""
  document.getElementById("cistoscopiaQuarta").checked = false
  document.getElementById("cistoscopiaGroup").classList.add("is-hidden")
  pacienteFormTitulo.innerText = "Novo paciente de retirada"
  btnCancelarEdicaoPaciente.classList.add("is-hidden")
  mensagemCadastro.innerText = ""
}

function checkCistoscopiaEligibility() {
  const sexo = document.getElementById("sexo").value
  const dataColocacao = document.getElementById("dataColocacao").value
  const group = document.getElementById("cistoscopiaGroup")
  const checkbox = document.getElementById("cistoscopiaQuarta")

  if (sexo === "feminino" && dataColocacao) {
    const colocacao = new Date(dataColocacao + "T12:00:00")
    const hoje = new Date()
    const diffMs = hoje - colocacao
    const diffMeses = diffMs / (1000 * 60 * 60 * 24 * 30.44)

    if (diffMeses < 6 && diffMeses >= 0) {
      group.classList.remove("is-hidden")
      checkbox.checked = true
      return
    }
  }

  group.classList.add("is-hidden")
  checkbox.checked = false
}

async function checkSecurityTables() {
  state.securityReady = true
  return state.securityReady
}

async function getCurrentUser() {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  return session?.user || null
}

async function getCurrentProfile() {
  const user = await getCurrentUser()
  if (!user || !state.securityReady) return null

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) {
    if (
      error.message?.includes("relation") ||
      error.message?.includes("does not exist") ||
      error.message?.includes("schema cache")
    ) {
      state.securityReady = false
    }
    return null
  }
  return data
}

async function loadProfilesMap() {
  if (!state.securityReady) return

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email")

  if (error || !data) return

  state.profilesMap = new Map(
    data.map((profile) => [
      profile.id,
      profile.full_name || profile.email || profile.id
    ])
  )
}

async function insertAuditLog(targetTable, action, patientId, details) {
  if (!state.securityReady || !state.currentUser) return

  await supabase.from("patient_audit_log").insert([
    {
      target_table: targetTable,
      action,
      patient_id: patientId || null,
      actor_id: state.currentUser.id,
      actor_name: actorName(state.currentUser.id),
      details
    }
  ])
}

function renderPatientCard(patient, mode) {
  const isHistory = mode === "history"
  const createdBy = actorName(patient.cadastrado_por)
  const removedBy = actorName(patient.retirado_por)
  const prazoMeses = patient.prazo_retirada_meses ?? 3
  const prazoDias = patient.prazo_retirada_dias ?? 0
  const dataPrazo = patient.data_prazo_retirada || patient.data_3_meses
  const subtitle = isHistory
    ? `Retirado em ${formatDate(patient.data_retirada)}`
    : patient.visualStatus
  const summaryDate = isHistory ? formatDate(patient.data_retirada) : formatDate(patient.data_colocacao)

  return createCard(
    `patient-card ${isHistory ? "retirado" : patient.visualClass}`,
    `
      <summary class="patient-summary">
        <div class="patient-summary-main">
          <span class="status-chip">${patient.visualStatus}</span>
          <div class="patient-summary-title">
            <h4>${patient.nome}</h4>
            <p>${subtitle}</p>
          </div>
        </div>
        <div class="patient-summary-meta">
          <span class="muted-line">Registro: ${patient.registro_hospitalar || "-"}</span>
          <span class="muted-line">${isHistory ? "Retirada" : "Data DJ"}: ${summaryDate}</span>
          <span class="patient-chevron">›</span>
        </div>
      </summary>
      <div class="patient-content">
        ${patient.cistoscopia_quarta && !isHistory ? '<div class="cistoscopia-badge">Cistoscopia às quartas (manhã)</div>' : ''}
        <div class="patient-meta">
          <div class="meta-line"><strong>Contato</strong><span>${patient.telefone || "-"}</span></div>
          <div class="meta-line"><strong>SMS autorizado</strong><span>${patient.contato_sms_autorizado ? "Sim" : "Não"}</span></div>
          <div class="meta-line"><strong>WhatsApp autorizado</strong><span>${patient.contato_whatsapp_autorizado ? "Sim" : "Não"}</span></div>
          <div class="meta-line"><strong>Sexo</strong><span>${patient.sexo === "feminino" ? "Feminino" : patient.sexo === "masculino" ? "Masculino" : "-"}</span></div>
          <div class="meta-line"><strong>Data do DJ</strong><span>${formatDate(patient.data_colocacao)}</span></div>
          <div class="meta-line"><strong>Prazo de retirada</strong><span>${prazoMeses} mês(es) e ${prazoDias} dia(s)</span></div>
          <div class="meta-line"><strong>Data limite de retirada</strong><span>${formatDate(dataPrazo)}</span></div>
          <div class="meta-line"><strong>Alerta 6 meses</strong><span>${formatDate(patient.data_6_meses)}</span></div>
          <div class="meta-line"><strong>Incluído por</strong><span>${createdBy}</span></div>
          <div class="meta-line"><strong>Incluído em</strong><span>${formatDateTime(patient.created_at)}</span></div>
          ${
            isHistory
              ? `<div class="meta-line"><strong>Retirado por</strong><span>${removedBy}</span></div>
                 <div class="meta-line"><strong>Retirado em</strong><span>${formatDate(patient.data_retirada)}</span></div>`
              : ""
          }
          <div class="meta-line"><strong>Observações</strong><span>${patient.observacoes || "-"}</span></div>
        </div>
        ${
          isHistory
            ? isAdmin()
              ? `<div class="patient-actions">
                   <button type="button" class="danger-button" data-action="excluir-paciente" data-id="${patient.id}">Excluir registro</button>
                 </div>`
              : ""
            : `<div class="patient-actions">
                <button type="button" class="secondary-button" data-action="editar-paciente" data-id="${patient.id}">Editar prazo/dados</button>
                <button type="button" data-action="retirar-paciente" data-id="${patient.id}">DJ retirado</button>
                ${
                  isAdmin()
                    ? `<button type="button" class="danger-button" data-action="excluir-paciente" data-id="${patient.id}">Excluir registro</button>`
                    : ""
                }
              </div>`
        }
      </div>
    `,
    "details"
  )
}

function renderTrocaCard(item, statusKey) {
  const classe = statusKey === "atrasada" ? "troca-atrasada" : statusKey === "proxima" ? "troca-proxima" : "troca-ok"
  const subtitle = statusKey === "atrasada" ? "Troca atrasada" : statusKey === "proxima" ? "Próxima troca" : "Programado"

  return createCard(
    `patient-card ${classe}`,
    `
      <summary class="patient-summary">
        <div class="patient-summary-main">
          <span class="status-chip">${subtitle}</span>
          <div class="patient-summary-title">
            <h4>${item.nome}</h4>
            <p>Próxima troca em ${formatDate(item.proxima_troca_data)}</p>
          </div>
        </div>
        <div class="patient-summary-meta">
          <span class="muted-line">Registro: ${item.registro_hospitalar || "-"}</span>
          <span class="muted-line">Intervalo: ${item.intervalo_meses}m ${item.intervalo_dias}d</span>
          <span class="patient-chevron">›</span>
        </div>
      </summary>
      <div class="patient-content">
        <div class="patient-meta">
          <div class="meta-line"><strong>Contato</strong><span>${item.telefone || "-"}</span></div>
          <div class="meta-line"><strong>Última troca</strong><span>${formatDate(item.ultima_troca_data)}</span></div>
          <div class="meta-line"><strong>Próxima troca</strong><span>${formatDate(item.proxima_troca_data)}</span></div>
          <div class="meta-line"><strong>Intervalo</strong><span>${item.intervalo_meses} mês(es) e ${item.intervalo_dias} dia(s)</span></div>
          <div class="meta-line"><strong>Cadastrado por</strong><span>${actorName(item.created_by)}</span></div>
          <div class="meta-line"><strong>Atualizado por</strong><span>${actorName(item.updated_by)}</span></div>
          <div class="meta-line"><strong>Observações</strong><span>${item.observacoes || "-"}</span></div>
        </div>
        <div class="patient-actions">
          <button type="button" data-action="editar-troca" data-id="${item.id}">Editar programação</button>
          <button type="button" class="secondary-button" data-action="registrar-troca" data-id="${item.id}">Registrar troca hoje</button>
          <button type="button" class="secondary-button" data-action="encerrar-troca" data-id="${item.id}">Encerrar controle</button>
          ${
            isAdmin()
              ? `<button type="button" class="danger-button" data-action="excluir-troca" data-id="${item.id}">Excluir registro</button>`
              : ""
          }
        </div>
      </div>
    `,
    "details"
  )
}

function renderAdminCard(profile) {
  return createCard(
    "admin-card",
    `
      <h4>${profile.full_name || profile.email || "Usuário sem nome"}</h4>
      <div class="patient-meta">
        <div class="meta-line"><strong>Email</strong><span>${profile.email || "-"}</span></div>
        <div class="meta-line"><strong>Solicitado em</strong><span>${formatDateTime(profile.created_at)}</span></div>
      </div>
      <div class="patient-actions">
        <button type="button" data-action="aprovar-usuario" data-id="${profile.id}">Aprovar</button>
        <button type="button" class="secondary-button" data-action="rejeitar-usuario" data-id="${profile.id}">Rejeitar</button>
      </div>
    `
  )
}

async function handleSecurityState() {
  return await checkSecurityTables()
}

async function refreshSessionState() {
  const ready = await handleSecurityState()
  if (!ready) return

  state.currentUser = await getCurrentUser()
  state.currentProfile = await getCurrentProfile()

  if (!state.securityReady) {
    state.currentUser = null
    state.currentProfile = null
    setProtectedDisabled(true)
    showSetupRequired("Execute o arquivo supabase-setup.sql no SQL Editor do Supabase para ativar aprovação, perfis e auditoria.")
    return
  }

  if (!state.currentUser) {
    setProtectedDisabled(true)
    showLoginPanels()
    clearLists()
    state.metrics = {
      ativos: 0,
      vencidos: 0,
      imagem: 0,
      retirados: 0,
      trocas: 0,
      trocasProximas: 0,
      trocasAtrasadas: 0
    }
    updateDashboard()
    setText(mensagemSistema, "")
    return
  }

  if (!state.currentProfile || !state.currentProfile.approved || !state.currentProfile.is_active) {
    setProtectedDisabled(true)
    showPendingAccess()
    return
  }

  await loadProfilesMap()

  setProtectedDisabled(false)
  showOnlyApp()
  setActiveSection(state.activeSection)
  setText(statusSessao, state.currentProfile.role === "admin" ? "Admin autenticado" : "Usuário autenticado")
  setText(usuarioLogado, state.currentProfile.full_name || state.currentUser.email || "Usuário autenticado")
  setText(perfilUsuario, `${state.currentUser.email || "-"} • ${state.currentProfile.role}`)

  navAcesso.classList.toggle("is-hidden", state.currentProfile.role !== "admin")
  if (state.currentProfile.role !== "admin" && state.activeSection === "acesso") {
    setActiveSection("dashboard")
  }

  await loadAllData()
}

async function loadAllData() {
  await loadPatients()
  await loadTrocasProgramadas()
  await loadPendingApprovals()
}

async function loadPatients() {
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("data_colocacao", { ascending: false })

  if (error) {
    setText(mensagemSistema, "Erro ao carregar pacientes: " + error.message)
    return
  }

  listaPrazo.innerHTML = ""
  listaVencidos.innerHTML = ""
  listaImagem.innerHTML = ""
  listaRetirados.innerHTML = ""

  let ativos = 0
  let vencidos = 0
  let imagem = 0
  let retirados = 0
  const hoje = new Date()

  data.forEach((patient) => {
    if (patient.data_retirada) {
      retirados++
      patient.visualClass = "retirado"
      patient.visualStatus = "Retirado"
      listaRetirados.appendChild(renderPatientCard(patient, "history"))
      return
    }

    ativos++
    let target = listaPrazo
    patient.visualClass = "noPrazo"
    patient.visualStatus = "No prazo"

    const prazoRetirada = patient.data_prazo_retirada || patient.data_3_meses
    const dataLimiteRetirada = new Date(prazoRetirada + "T12:00:00")
    const d6 = new Date(patient.data_6_meses + "T12:00:00")

    if (hoje >= d6) {
      patient.visualClass = "vencido6"
      patient.visualStatus = "Convocar consulta / imagem"
      target = listaImagem
      imagem++
    } else if (hoje >= dataLimiteRetirada) {
      patient.visualClass = "vencido3"
      patient.visualStatus = "Vencido"
      target = listaVencidos
      vencidos++
    }

    target.appendChild(renderPatientCard(patient, "active"))
  })

  if (!listaVencidos.children.length) {
    listaVencidos.innerHTML = '<p class="empty-state">Nenhum paciente vencido.</p>'
  }

  if (!listaImagem.children.length) {
    listaImagem.innerHTML = '<p class="empty-state">Nenhum paciente para convocação.</p>'
  }

  if (!listaPrazo.children.length) {
    listaPrazo.innerHTML = '<p class="empty-state">Nenhum paciente no prazo.</p>'
  }

  if (!listaRetirados.children.length) {
    listaRetirados.innerHTML = '<p class="empty-state">Nenhum paciente retirado.</p>'
  }

  state.metrics.ativos = ativos
  state.metrics.vencidos = vencidos
  state.metrics.imagem = imagem
  state.metrics.retirados = retirados
  updateDashboard()

  applySearch()
}

async function loadTrocasProgramadas() {
  const { data, error } = await supabase
    .from("pacientes_troca_programada")
    .select("*")
    .eq("status", "ativo")
    .order("proxima_troca_data", { ascending: true })

  if (error) {
    setText(mensagemSistema, "Erro ao carregar trocas programadas: " + error.message)
    return
  }

  listaTrocaAtrasada.innerHTML = ""
  listaTrocaProxima.innerHTML = ""
  listaTrocaPrazo.innerHTML = ""

  let total = 0
  let proximas = 0
  let atrasadas = 0
  const hoje = new Date()
  const quinzeDias = new Date()
  quinzeDias.setDate(hoje.getDate() + 15)

  data.forEach((item) => {
    total++
    const nextDate = new Date(item.proxima_troca_data + "T12:00:00")

    if (nextDate < hoje) {
      listaTrocaAtrasada.appendChild(renderTrocaCard(item, "atrasada"))
      atrasadas++
      proximas++
    } else if (nextDate <= quinzeDias) {
      listaTrocaProxima.appendChild(renderTrocaCard(item, "proxima"))
      proximas++
    } else {
      listaTrocaPrazo.appendChild(renderTrocaCard(item, "ok"))
    }
  })

  if (!listaTrocaAtrasada.children.length) {
    listaTrocaAtrasada.innerHTML = '<p class="empty-state">Nenhuma troca atrasada.</p>'
  }

  if (!listaTrocaProxima.children.length) {
    listaTrocaProxima.innerHTML = '<p class="empty-state">Nenhuma troca próxima.</p>'
  }

  if (!listaTrocaPrazo.children.length) {
    listaTrocaPrazo.innerHTML = '<p class="empty-state">Nenhuma troca programada em prazo confortável.</p>'
  }

  state.metrics.trocas = total
  state.metrics.trocasProximas = proximas
  state.metrics.trocasAtrasadas = atrasadas
  updateDashboard()
}

async function loadPendingApprovals() {
  if (state.currentProfile?.role !== "admin") {
    listaAprovacoes.innerHTML = '<p class="empty-state">Apenas administradores podem gerenciar acessos.</p>'
    return
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, approved, is_active, created_at")
    .eq("approved", false)
    .eq("is_active", true)
    .order("created_at", { ascending: true })

  if (error) {
    listaAprovacoes.innerHTML = `<p class="empty-state">Erro ao carregar aprovações: ${error.message}</p>`
    return
  }

  listaAprovacoes.innerHTML = ""
  if (!data.length) {
    listaAprovacoes.innerHTML = '<p class="empty-state">Nenhuma solicitação pendente.</p>'
    return
  }

  data.forEach((profile) => {
    listaAprovacoes.appendChild(renderAdminCard(profile))
  })
}

async function submitLogin() {
  const email = document.getElementById("email").value.trim()
  const senha = document.getElementById("senha").value.trim()

  if (!email || !senha) {
    setText(mensagemLogin, "Preencha email e senha.")
    return
  }

  setText(mensagemLogin, "Entrando...")
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha })

  if (error) {
    setText(mensagemLogin, "Erro no login: " + error.message)
    return
  }

  setText(mensagemLogin, "Login realizado.")
  await refreshSessionState()
}

async function submitAccessRequest() {
  const fullName = document.getElementById("cadastroNome").value.trim()
  const email = document.getElementById("cadastroEmail").value.trim()
  const password = document.getElementById("cadastroSenha").value.trim()

  if (!fullName || !email || !password) {
    setText(mensagemCadastroAcesso, "Preencha nome, email e senha.")
    return
  }

  setText(mensagemCadastroAcesso, "Criando solicitação de acesso...")

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  })

  if (error) {
    setText(mensagemCadastroAcesso, "Erro ao solicitar acesso: " + error.message)
    return
  }

  if (state.securityReady && data.user?.id) {
    await supabase.from("profiles").upsert([
      {
        id: data.user.id,
        full_name: fullName,
        email
      }
    ]).then(() => null).catch(() => null)
  }

  await supabase.auth.signOut()
  document.getElementById("cadastroNome").value = ""
  document.getElementById("cadastroEmail").value = ""
  document.getElementById("cadastroSenha").value = ""
  setText(mensagemCadastroAcesso, "Solicitação criada. Aguarde aprovação do administrador.")
  setAuthTab("login")
}

async function savePatient() {
  if (!state.currentUser || !state.currentProfile?.approved) {
    setText(mensagemCadastro, "Seu usuário precisa estar aprovado para cadastrar.")
    return
  }

  const id = document.getElementById("pacienteId").value
  const nome = document.getElementById("nome").value.trim()
  const registro = document.getElementById("registro").value.trim()
  const telefone = document.getElementById("telefone").value.trim()
  const contatoSmsAutorizado = document.getElementById("contatoSmsAutorizado").checked
  const contatoWhatsappAutorizado = document.getElementById("contatoWhatsappAutorizado").checked
  const sexo = document.getElementById("sexo").value
  const dataColocacao = document.getElementById("dataColocacao").value
  const prazoRetiradaMeses = Number(document.getElementById("prazoRetiradaMeses").value || 0)
  const prazoRetiradaDias = Number(document.getElementById("prazoRetiradaDias").value || 0)
  const cistoscopiaQuarta = document.getElementById("cistoscopiaQuarta").checked
    && !document.getElementById("cistoscopiaGroup").classList.contains("is-hidden")
  const observacoes = document.getElementById("observacoes").value.trim()

  if (!nome || !registro || !dataColocacao) {
    setText(mensagemCadastro, "Preencha nome, registro e data de colocação.")
    return
  }

  if (prazoRetiradaMeses <= 0 && prazoRetiradaDias <= 0) {
    setText(mensagemCadastro, "Defina um prazo de retirada maior que zero.")
    return
  }

  const payload = {
    nome,
    registro_hospitalar: registro,
    telefone,
    contato_sms_autorizado: contatoSmsAutorizado,
    contato_whatsapp_autorizado: contatoWhatsappAutorizado,
    sexo: sexo || null,
    data_colocacao: dataColocacao,
    data_3_meses: addMonthsAndDays(dataColocacao, 3, 0),
    data_6_meses: addMonthsAndDays(dataColocacao, 6, 0),
    prazo_retirada_meses: prazoRetiradaMeses,
    prazo_retirada_dias: prazoRetiradaDias,
    data_prazo_retirada: addMonthsAndDays(dataColocacao, prazoRetiradaMeses, prazoRetiradaDias),
    cistoscopia_quarta: cistoscopiaQuarta,
    observacoes
  }

  let response
  if (id) {
    response = await supabase
      .from("pacientes")
      .update(payload)
      .eq("id", id)
      .select()
      .single()
  } else {
    response = await supabase
      .from("pacientes")
      .insert([
        {
          ...payload,
          status: "ativo",
          cadastrado_por: state.currentUser.id
        }
      ])
      .select()
      .single()
  }

  if (response.error) {
    setText(mensagemCadastro, "Erro ao salvar paciente: " + response.error.message)
    return
  }

  await insertAuditLog("pacientes", id ? "update" : "insert", response.data.id, {
    nome,
    registro_hospitalar: registro,
    data_prazo_retirada: payload.data_prazo_retirada,
    prazo_retirada_meses: prazoRetiradaMeses,
    prazo_retirada_dias: prazoRetiradaDias
  })

  resetPacienteForm()
  setText(mensagemCadastro, id ? "Paciente atualizado com sucesso." : "Paciente salvo com sucesso.")
  if (!id) {
    await requestPatientNotification(response.data.id, "cadastro", mensagemCadastro)
  }
  await loadPatients()
}

async function loadPatientIntoForm(id) {
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    setText(mensagemSistema, "Erro ao carregar paciente: " + error.message)
    return
  }

  document.getElementById("pacienteId").value = data.id
  document.getElementById("nome").value = data.nome || ""
  document.getElementById("registro").value = data.registro_hospitalar || ""
  document.getElementById("telefone").value = data.telefone || ""
  document.getElementById("contatoSmsAutorizado").checked = Boolean(data.contato_sms_autorizado)
  document.getElementById("contatoWhatsappAutorizado").checked = Boolean(data.contato_whatsapp_autorizado)
  document.getElementById("sexo").value = data.sexo || ""
  document.getElementById("dataColocacao").value = data.data_colocacao || ""
  document.getElementById("prazoRetiradaMeses").value = data.prazo_retirada_meses ?? 3
  document.getElementById("prazoRetiradaDias").value = data.prazo_retirada_dias ?? 0
  document.getElementById("observacoes").value = data.observacoes || ""
  document.getElementById("cistoscopiaQuarta").checked = Boolean(data.cistoscopia_quarta)
  pacienteFormTitulo.innerText = "Editar paciente de retirada"
  btnCancelarEdicaoPaciente.classList.remove("is-hidden")
  mensagemCadastro.innerText = ""
  checkCistoscopiaEligibility()
  setActiveSection("cadastro-retirada")
}

async function requestPatientNotification(patientId, notificationType, messageNode = mensagemSistema) {
  const { data: sessionData } = await supabase.auth.getSession()
  const token = sessionData.session?.access_token

  if (!token) {
    setText(messageNode, "Paciente salvo, mas a notificação não foi enviada porque a sessão expirou.")
    return
  }

  try {
    const response = await fetch("/api/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        patientId,
        notificationType
      })
    })

    const result = await response.json().catch(() => ({}))

    if (!response.ok) {
      setText(messageNode, `Paciente salvo, mas houve erro na notificação: ${result.error || response.statusText}`)
      return
    }

    if (result.sent > 0) {
      setText(messageNode, `Paciente salvo com sucesso. Notificação enviada por ${result.channels.join(" e ")}.`)
    } else if (result.skipped) {
      setText(messageNode, `Paciente salvo com sucesso. Notificação não enviada: ${result.skipped}.`)
    }
  } catch (error) {
    setText(messageNode, "Paciente salvo, mas a notificação não foi enviada por falha de conexão.")
  }
}

async function markPatientRemoved(id) {
  if (!window.confirm("Confirmar retirada do Duplo J deste paciente?")) {
    return
  }

  const hoje = new Date().toISOString().split("T")[0]

  const { error } = await supabase
    .from("pacientes")
    .update({
      data_retirada: hoje,
      status: "retirado",
      retirado_por: state.currentUser.id
    })
    .eq("id", id)

  if (error) {
    setText(mensagemSistema, "Erro ao registrar retirada: " + error.message)
    return
  }

  await insertAuditLog("pacientes", "retirada", id, {
    data_retirada: hoje
  })

  await loadPatients()
}

async function deletePatientRecord(id) {
  if (!isAdmin()) {
    setText(mensagemSistema, "Apenas administradores podem excluir registros.")
    return
  }

  if (!window.confirm("Excluir definitivamente este registro de paciente? Esta ação não pode ser desfeita.")) {
    return
  }

  const { data: patient, error: loadError } = await supabase
    .from("pacientes")
    .select("*")
    .eq("id", id)
    .single()

  if (loadError) {
    setText(mensagemSistema, "Erro ao localizar registro: " + loadError.message)
    return
  }

  const { error } = await supabase
    .from("pacientes")
    .delete()
    .eq("id", id)

  if (error) {
    setText(mensagemSistema, "Erro ao excluir registro: " + error.message)
    return
  }

  await insertAuditLog("pacientes", "delete", id, {
    nome: patient.nome,
    registro_hospitalar: patient.registro_hospitalar
  })

  setText(mensagemSistema, "Registro excluído com sucesso.")
  await loadPatients()
}

async function saveTrocaProgramada() {
  if (!state.currentUser || !state.currentProfile?.approved) {
    setText(mensagemTroca, "Seu usuário precisa estar aprovado para salvar trocas.")
    return
  }

  const id = document.getElementById("trocaId").value
  const nome = document.getElementById("trocaNome").value.trim()
  const registro = document.getElementById("trocaRegistro").value.trim()
  const telefone = document.getElementById("trocaTelefone").value.trim()
  const ultimaTroca = document.getElementById("trocaUltimaData").value
  const intervaloMeses = Number(document.getElementById("trocaIntervaloMeses").value || 0)
  const intervaloDias = Number(document.getElementById("trocaIntervaloDias").value || 0)
  const observacoes = document.getElementById("trocaObservacoes").value.trim()

  if (!nome || !registro || !ultimaTroca) {
    setText(mensagemTroca, "Preencha nome, registro e data da última troca.")
    return
  }

  const payload = {
    nome,
    registro_hospitalar: registro,
    telefone,
    ultima_troca_data: ultimaTroca,
    intervalo_meses: intervaloMeses,
    intervalo_dias: intervaloDias,
    proxima_troca_data: addMonthsAndDays(ultimaTroca, intervaloMeses, intervaloDias),
    observacoes,
    updated_by: state.currentUser.id
  }

  let response

  if (id) {
    response = await supabase
      .from("pacientes_troca_programada")
      .update(payload)
      .eq("id", id)
      .select()
      .single()
  } else {
    response = await supabase
      .from("pacientes_troca_programada")
      .insert([{ ...payload, created_by: state.currentUser.id, status: "ativo" }])
      .select()
      .single()
  }

  if (response.error) {
    setText(mensagemTroca, "Erro ao salvar programação: " + response.error.message)
    return
  }

  await insertAuditLog("pacientes_troca_programada", id ? "update" : "insert", response.data.id, {
    nome,
    registro_hospitalar: registro,
    proxima_troca_data: payload.proxima_troca_data
  })

  resetTrocaForm()
  setText(mensagemTroca, "Programação de troca salva com sucesso.")
  await loadTrocasProgramadas()
}

async function loadTrocaIntoForm(id) {
  const { data, error } = await supabase
    .from("pacientes_troca_programada")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    setText(mensagemTroca, "Erro ao abrir programação: " + error.message)
    return
  }

  document.getElementById("trocaId").value = data.id
  document.getElementById("trocaNome").value = data.nome
  document.getElementById("trocaRegistro").value = data.registro_hospitalar
  document.getElementById("trocaTelefone").value = data.telefone || ""
  document.getElementById("trocaUltimaData").value = data.ultima_troca_data
  document.getElementById("trocaIntervaloMeses").value = data.intervalo_meses
  document.getElementById("trocaIntervaloDias").value = data.intervalo_dias
  document.getElementById("trocaObservacoes").value = data.observacoes || ""
  trocaFormTitulo.innerText = "Editar paciente de troca periódica"
  btnCancelarEdicaoTroca.classList.remove("is-hidden")
  setActiveSection("cadastro-troca")
}

async function registerTrocaToday(id) {
  if (!window.confirm("Registrar a troca como realizada hoje?")) {
    return
  }

  const { data, error } = await supabase
    .from("pacientes_troca_programada")
    .select("*")
    .eq("id", id)
    .single()

  if (error) {
    setText(mensagemSistema, "Erro ao carregar item de troca: " + error.message)
    return
  }

  const hoje = new Date().toISOString().split("T")[0]

  const { error: updateError } = await supabase
    .from("pacientes_troca_programada")
    .update({
      ultima_troca_data: hoje,
      proxima_troca_data: addMonthsAndDays(hoje, data.intervalo_meses, data.intervalo_dias),
      updated_by: state.currentUser.id
    })
    .eq("id", id)

  if (updateError) {
    setText(mensagemSistema, "Erro ao registrar troca: " + updateError.message)
    return
  }

  await insertAuditLog("pacientes_troca_programada", "troca_realizada", id, {
    ultima_troca_data: hoje
  })

  await loadTrocasProgramadas()
}

async function closeTrocaControl(id) {
  if (!window.confirm("Encerrar o controle periódico deste paciente?")) {
    return
  }

  const { error } = await supabase
    .from("pacientes_troca_programada")
    .update({
      status: "encerrado",
      updated_by: state.currentUser.id
    })
    .eq("id", id)

  if (error) {
    setText(mensagemSistema, "Erro ao encerrar controle de troca: " + error.message)
    return
  }

  await insertAuditLog("pacientes_troca_programada", "encerrado", id, {})
  await loadTrocasProgramadas()
}

async function deleteTrocaRecord(id) {
  if (!isAdmin()) {
    setText(mensagemSistema, "Apenas administradores podem excluir registros.")
    return
  }

  if (!window.confirm("Excluir definitivamente esta programação de troca? Esta ação não pode ser desfeita.")) {
    return
  }

  const { data: item, error: loadError } = await supabase
    .from("pacientes_troca_programada")
    .select("*")
    .eq("id", id)
    .single()

  if (loadError) {
    setText(mensagemSistema, "Erro ao localizar troca: " + loadError.message)
    return
  }

  const { error } = await supabase
    .from("pacientes_troca_programada")
    .delete()
    .eq("id", id)

  if (error) {
    setText(mensagemSistema, "Erro ao excluir troca: " + error.message)
    return
  }

  await insertAuditLog("pacientes_troca_programada", "delete", id, {
    nome: item.nome,
    registro_hospitalar: item.registro_hospitalar
  })

  setText(mensagemSistema, "Programação excluída com sucesso.")
  await loadTrocasProgramadas()
}

async function approveUser(id) {
  const { error } = await supabase
    .from("profiles")
    .update({
      approved: true,
      approved_at: new Date().toISOString(),
      approved_by: state.currentUser.id,
      role: "user"
    })
    .eq("id", id)

  if (error) {
    setText(mensagemSistema, "Erro ao aprovar usuário: " + error.message)
    return
  }

  await loadPendingApprovals()
}

async function rejectUser(id) {
  const { error } = await supabase
    .from("profiles")
    .update({
      is_active: false,
      approved_by: state.currentUser.id,
      approved_at: new Date().toISOString()
    })
    .eq("id", id)

  if (error) {
    setText(mensagemSistema, "Erro ao rejeitar usuário: " + error.message)
    return
  }

  await loadPendingApprovals()
}

async function exportCsv() {
  const { data: pacientes, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("data_colocacao", { ascending: false })

  if (error) {
    setText(mensagemSistema, "Erro ao exportar CSV: " + error.message)
    return
  }

  const rows = pacientes.map((patient) =>
    [
      patient.nome,
      patient.registro_hospitalar,
      patient.telefone,
      patient.contato_sms_autorizado ? "Sim" : "Não",
      patient.contato_whatsapp_autorizado ? "Sim" : "Não",
      patient.sexo,
      patient.data_colocacao,
      patient.prazo_retirada_meses,
      patient.prazo_retirada_dias,
      patient.data_prazo_retirada,
      patient.data_3_meses,
      patient.data_6_meses,
      patient.status,
      patient.cistoscopia_quarta ? "Sim" : "Não",
      patient.data_retirada,
      actorName(patient.cadastrado_por),
      actorName(patient.retirado_por),
      patient.observacoes
    ]
      .map(csvEscape)
      .join(",")
  )

  const header = [
    "nome",
    "registro_hospitalar",
    "telefone",
    "sms_autorizado",
    "whatsapp_autorizado",
    "sexo",
    "data_colocacao",
    "prazo_retirada_meses",
    "prazo_retirada_dias",
    "data_prazo_retirada",
    "data_3_meses",
    "data_6_meses",
    "status",
    "cistoscopia_quarta",
    "data_retirada",
    "incluido_por",
    "retirado_por",
    "observacoes"
  ].join(",")

  downloadCsv(`controle-duplo-j-${slugDate()}.csv`, [header, ...rows].join("\n"))
  setText(mensagemSistema, "Arquivo CSV exportado.")
}

function applySearch() {
  const term = campoBusca.value.toLowerCase().trim()
  const currentSection = document.querySelector(".page-section:not(.is-hidden)")
  const cards = currentSection?.querySelectorAll(".patient-card, .admin-card") || []

  cards.forEach((card) => {
    const content = card.innerText.toLowerCase()
    card.style.display = content.includes(term) ? "block" : "none"
  })
}

document.addEventListener("click", async (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  const action = target.dataset.action
  const id = target.dataset.id

  if (!action || !id) return

  if (action === "editar-paciente") await loadPatientIntoForm(id)
  if (action === "retirar-paciente") await markPatientRemoved(id)
  if (action === "excluir-paciente") await deletePatientRecord(id)
  if (action === "editar-troca") await loadTrocaIntoForm(id)
  if (action === "registrar-troca") await registerTrocaToday(id)
  if (action === "encerrar-troca") await closeTrocaControl(id)
  if (action === "excluir-troca") await deleteTrocaRecord(id)
  if (action === "aprovar-usuario") await approveUser(id)
  if (action === "rejeitar-usuario") await rejectUser(id)
})

tabLogin.addEventListener("click", () => setAuthTab("login"))
tabCadastro.addEventListener("click", () => setAuthTab("cadastro"))

navCadastroRetirada.addEventListener("click", () => {
  toggleSection("cadastro-retirada")
  closeSidebarIfNeeded()
})
navListaRetirada.addEventListener("click", () => {
  toggleSection("lista-retirada")
  closeSidebarIfNeeded()
})
navHistoricoRetirada.addEventListener("click", () => {
  toggleSection("historico-retirada")
  closeSidebarIfNeeded()
})
navCadastroTroca.addEventListener("click", () => {
  toggleSection("cadastro-troca")
  closeSidebarIfNeeded()
})
navListaTroca.addEventListener("click", () => {
  toggleSection("lista-troca")
  closeSidebarIfNeeded()
})
navAcesso.addEventListener("click", () => {
  toggleSection("acesso")
  closeSidebarIfNeeded()
})

toggleSidebar.addEventListener("click", () => {
  const collapsed = appView.classList.toggle("sidebar-collapsed")
  toggleSidebar.setAttribute("aria-expanded", String(!collapsed))
})

btnLogin.addEventListener("click", submitLogin)
btnSolicitarAcesso.addEventListener("click", submitAccessRequest)
btnLogout.addEventListener("click", async () => {
  await supabase.auth.signOut()
  await refreshSessionState()
})
btnLogoutPending.addEventListener("click", async () => {
  await supabase.auth.signOut()
  await refreshSessionState()
})
btnCarregar.addEventListener("click", loadAllData)
btnSalvarPaciente.addEventListener("click", savePatient)
btnCancelarEdicaoPaciente.addEventListener("click", resetPacienteForm)
btnSalvarTroca.addEventListener("click", saveTrocaProgramada)
btnCancelarEdicaoTroca.addEventListener("click", resetTrocaForm)
btnExportarCsv.addEventListener("click", exportCsv)
campoBusca.addEventListener("input", applySearch)
document.getElementById("sexo").addEventListener("change", checkCistoscopiaEligibility)
document.getElementById("dataColocacao").addEventListener("change", checkCistoscopiaEligibility)

supabase.auth.onAuthStateChange(() => {
  refreshSessionState()
})

if (window.innerWidth <= 1120) {
  appView.classList.add("sidebar-collapsed")
  toggleSidebar.setAttribute("aria-expanded", "false")
}

await refreshSessionState()
