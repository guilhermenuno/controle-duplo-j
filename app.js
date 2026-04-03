import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabaseUrl = "https://forbdpfbuuwbqcwvscjq.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcmJkcGZidXV3YnFjd3ZzY2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzcwMjYsImV4cCI6MjA4ODg1MzAyNn0.fHgxkQlWjjss7DC3lL27EE6n7LWQQ0Ly3eQ_6YQRqEM"

const supabase = createClient(supabaseUrl, supabaseKey)

const btnLogin = document.getElementById("login")
const btnLogout = document.getElementById("logout")
const btnCarregar = document.getElementById("carregar")
const btnExportarCsv = document.getElementById("exportarCsv")
const mensagem = document.getElementById("mensagem")

const btnSalvarPaciente = document.getElementById("salvarPaciente")
const mensagemCadastro = document.getElementById("mensagemCadastro")

const listaPrazo = document.getElementById("listaPrazo")
const listaVencidos = document.getElementById("listaVencidos")
const listaImagem = document.getElementById("listaImagem")
const listaRetirados = document.getElementById("listaRetirados")

const campoBusca = document.getElementById("busca")
const totalPacientes = document.getElementById("totalPacientes")
const totalVencidos = document.getElementById("totalVencidos")
const totalImagem = document.getElementById("totalImagem")
const totalRetirados = document.getElementById("totalRetirados")
const statusSessao = document.getElementById("statusSessao")
const usuarioLogado = document.getElementById("usuarioLogado")

const camposProtegidos = [
  campoBusca,
  btnCarregar,
  btnExportarCsv,
  btnSalvarPaciente,
  document.getElementById("nome"),
  document.getElementById("registro"),
  document.getElementById("telefone"),
  document.getElementById("dataColocacao"),
  document.getElementById("observacoes")
]

function adicionarMeses(dataString, meses) {
  const data = new Date(dataString + "T12:00:00")
  data.setMonth(data.getMonth() + meses)
  return data.toISOString().split("T")[0]
}

function limparListas() {
  listaPrazo.innerHTML = ""
  listaVencidos.innerHTML = ""
  listaImagem.innerHTML = ""
  listaRetirados.innerHTML = ""
}

function atualizarDashboard({ ativos = 0, vencidos = 0, imagem = 0, retirados = 0 } = {}) {
  totalPacientes.innerText = ativos
  totalVencidos.innerText = vencidos
  totalImagem.innerText = imagem
  totalRetirados.innerText = retirados
}

function configurarAcesso(usuario) {
  const autenticado = Boolean(usuario)

  camposProtegidos.forEach((campo) => {
    campo.disabled = !autenticado
  })

  btnLogout.hidden = !autenticado
  statusSessao.innerText = autenticado ? "Autenticado" : "Não autenticado"
  usuarioLogado.innerText = autenticado
    ? usuario.email || "Usuário conectado"
    : "Faça login para liberar o sistema"

  if (!autenticado) {
    mensagemCadastro.innerText = "Entre com seu usuário para cadastrar e visualizar pacientes."
    limparListas()
    listaVencidos.innerHTML = '<p class="empty-state">Faça login para visualizar os pacientes.</p>'
    listaImagem.innerHTML = ""
    listaPrazo.innerHTML = ""
    listaRetirados.innerHTML = '<p class="empty-state">Faça login para visualizar o histórico.</p>'
    atualizarDashboard()
    campoBusca.value = ""
    return
  }

  mensagemCadastro.innerText = ""
}

async function obterUsuarioAtual() {
  const {
    data: { session }
  } = await supabase.auth.getSession()

  return session?.user || null
}

function formatarDataArquivo() {
  const agora = new Date()
  const ano = agora.getFullYear()
  const mes = String(agora.getMonth() + 1).padStart(2, "0")
  const dia = String(agora.getDate()).padStart(2, "0")
  return `${ano}-${mes}-${dia}`
}

function escaparCsv(valor) {
  const texto = String(valor ?? "")
  const seguro = texto.replaceAll('"', '""')
  return `"${seguro}"`
}

function baixarArquivoCsv(nomeArquivo, conteudo) {
  const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

btnLogin.onclick = async () => {
  const email = document.getElementById("email").value.trim()
  const senha = document.getElementById("senha").value.trim()

  if (!email || !senha) {
    mensagem.innerText = "Preencha email e senha."
    return
  }

  mensagem.innerText = "Entrando..."

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  })

  if (error) {
    mensagem.innerText = "Erro no login: " + error.message
    return
  }

  const usuario = await obterUsuarioAtual()
  configurarAcesso(usuario)
  mensagem.innerText = "Login realizado."
  await carregarPacientes()
}

btnLogout.onclick = async () => {
  const { error } = await supabase.auth.signOut()

  if (error) {
    mensagem.innerText = "Erro ao sair: " + error.message
    return
  }

  mensagem.innerText = "Sessão encerrada."
  configurarAcesso(null)
}

btnSalvarPaciente.onclick = async () => {
  const usuario = await obterUsuarioAtual()

  if (!usuario) {
    mensagemCadastro.innerText = "Faça login antes de cadastrar."
    return
  }

  const nome = document.getElementById("nome").value.trim()
  const registro = document.getElementById("registro").value.trim()
  const telefone = document.getElementById("telefone").value.trim()
  const dataColocacao = document.getElementById("dataColocacao").value
  const observacoes = document.getElementById("observacoes").value.trim()

  if (!nome || !registro || !dataColocacao) {
    mensagemCadastro.innerText = "Preencha nome, registro e data."
    return
  }

  const data3 = adicionarMeses(dataColocacao, 3)
  const data6 = adicionarMeses(dataColocacao, 6)

  const { error } = await supabase.from("pacientes").insert([
    {
      nome,
      registro_hospitalar: registro,
      telefone,
      data_colocacao: dataColocacao,
      data_3_meses: data3,
      data_6_meses: data6,
      observacoes,
      status: "ativo",
      cadastrado_por: usuario.id
    }
  ])

  if (error) {
    mensagemCadastro.innerText = "Erro ao salvar: " + error.message
    return
  }

  mensagemCadastro.innerText = "Paciente salvo com sucesso."

  document.getElementById("nome").value = ""
  document.getElementById("registro").value = ""
  document.getElementById("telefone").value = ""
  document.getElementById("dataColocacao").value = ""
  document.getElementById("observacoes").value = ""

  await carregarPacientes()
}

btnCarregar.onclick = async () => {
  await carregarPacientes()
}

btnExportarCsv.onclick = async () => {
  const usuario = await obterUsuarioAtual()

  if (!usuario) {
    mensagem.innerText = "Faça login para exportar a lista."
    return
  }

  mensagem.innerText = "Gerando arquivo CSV..."

  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("data_colocacao", { ascending: false })

  if (error) {
    mensagem.innerText = "Erro ao exportar: " + error.message
    return
  }

  const cabecalho = [
    "nome",
    "registro_hospitalar",
    "telefone",
    "data_colocacao",
    "data_3_meses",
    "data_6_meses",
    "status_lista",
    "status_banco",
    "data_retirada",
    "observacoes",
    "cadastrado_por"
  ]

  const hoje = new Date()

  const linhas = data.map((p) => {
    let statusLista = "No prazo"

    if (p.data_retirada) {
      statusLista = "Retirado"
    } else {
      const d3 = new Date(p.data_3_meses + "T12:00:00")
      const d6 = new Date(p.data_6_meses + "T12:00:00")

      if (hoje >= d6) {
        statusLista = "Convocar consulta / imagem"
      } else if (hoje >= d3) {
        statusLista = "Vencido"
      }
    }

    return [
      p.nome,
      p.registro_hospitalar,
      p.telefone,
      p.data_colocacao,
      p.data_3_meses,
      p.data_6_meses,
      statusLista,
      p.status,
      p.data_retirada,
      p.observacoes,
      p.cadastrado_por
    ]
      .map(escaparCsv)
      .join(",")
  })

  const csv = [cabecalho.join(","), ...linhas].join("\n")
  baixarArquivoCsv(`controle-duplo-j-${formatarDataArquivo()}.csv`, csv)
  mensagem.innerText = "Arquivo CSV exportado."
}

async function retirarDJ(id) {
  const usuario = await obterUsuarioAtual()

  if (!usuario) {
    alert("Faça login para registrar retirada.")
    return
  }

  if (!window.confirm("Confirmar retirada do Duplo J deste paciente?")) {
    return
  }

  const hoje = new Date().toISOString().split("T")[0]

  const { error } = await supabase
    .from("pacientes")
    .update({
      data_retirada: hoje,
      status: "retirado"
    })
    .eq("id", id)

  if (error) {
    alert("Erro ao retirar DJ: " + error.message)
    return
  }

  await carregarPacientes()
}

async function carregarPacientes() {
  const usuario = await obterUsuarioAtual()

  if (!usuario) {
    configurarAcesso(null)
    return
  }

  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("data_colocacao", { ascending: false })

  if (error) {
    alert("Erro ao carregar pacientes: " + error.message)
    return
  }

  limparListas()

  let contPacientes = 0
  let contVencidos = 0
  let contImagem = 0
  let contRetirados = 0

  const hoje = new Date()

  data.forEach((p) => {
    if (p.data_retirada) {
      contRetirados++

      const retirado = document.createElement("div")
      retirado.className = "paciente retirado"
      retirado.innerHTML = `
        <strong>${p.nome}</strong><br>
        Registro: ${p.registro_hospitalar || "-"}<br>
        Telefone: ${p.telefone || "-"}<br>
        Data DJ: ${p.data_colocacao || "-"}<br>
        Retirado em: ${p.data_retirada || "-"}<br>
        Observações: ${p.observacoes || "-"}
      `

      listaRetirados.appendChild(retirado)
      return
    }

    contPacientes++

    let destino = listaPrazo
    let classe = "noPrazo"
    let statusTexto = "No prazo"

    const d3 = new Date(p.data_3_meses + "T12:00:00")
    const d6 = new Date(p.data_6_meses + "T12:00:00")

    if (hoje >= d6) {
      destino = listaImagem
      classe = "vencido6"
      statusTexto = "Convocar consulta / imagem"
      contImagem++
    } else if (hoje >= d3) {
      destino = listaVencidos
      classe = "vencido3"
      statusTexto = "Vencido"
      contVencidos++
    }

    const div = document.createElement("div")
    div.className = "paciente " + classe

    div.innerHTML = `
      <strong>${p.nome}</strong><br>
      Registro: ${p.registro_hospitalar || "-"}<br>
      Telefone: ${p.telefone || "-"}<br>
      Data DJ: ${p.data_colocacao || "-"}<br>
      3 meses: ${p.data_3_meses || "-"}<br>
      6 meses: ${p.data_6_meses || "-"}<br>
      Status: ${statusTexto}<br>
      Observações: ${p.observacoes || "-"}<br>
      <button onclick="retirarDJ('${p.id}')">DJ retirado</button>
    `

    destino.appendChild(div)
  })

  if (!contPacientes) {
    listaPrazo.innerHTML = '<p class="empty-state">Nenhum paciente no prazo.</p>'
    listaVencidos.innerHTML = '<p class="empty-state">Nenhum paciente vencido.</p>'
    listaImagem.innerHTML = '<p class="empty-state">Nenhum paciente para convocação.</p>'
  } else {
    if (!listaVencidos.children.length) {
      listaVencidos.innerHTML = '<p class="empty-state">Nenhum paciente vencido.</p>'
    }

    if (!listaImagem.children.length) {
      listaImagem.innerHTML = '<p class="empty-state">Nenhum paciente para convocação.</p>'
    }

    if (!listaPrazo.children.length) {
      listaPrazo.innerHTML = '<p class="empty-state">Nenhum paciente no prazo.</p>'
    }
  }

  if (!contRetirados) {
    listaRetirados.innerHTML = '<p class="empty-state">Nenhum paciente retirado.</p>'
  }

  atualizarDashboard({
    ativos: contPacientes,
    vencidos: contVencidos,
    imagem: contImagem,
    retirados: contRetirados
  })

  aplicarBusca()
}

function aplicarBusca() {
  const termo = campoBusca.value.toLowerCase().trim()
  const pacientes = document.querySelectorAll(".paciente")

  pacientes.forEach((p) => {
    const texto = p.innerText.toLowerCase()
    p.style.display = texto.includes(termo) ? "block" : "none"
  })
}

campoBusca.addEventListener("input", aplicarBusca)

supabase.auth.onAuthStateChange((_event, session) => {
  configurarAcesso(session?.user || null)
})

window.retirarDJ = retirarDJ

const usuarioInicial = await obterUsuarioAtual()
configurarAcesso(usuarioInicial)

if (usuarioInicial) {
  await carregarPacientes()
}
