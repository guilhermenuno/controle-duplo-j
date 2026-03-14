import { createClient } from "https://esm.sh/@supabase/supabase-js"

const supabaseUrl = "https://forbdpfbuuwbqcwvscjq.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvcmJkcGZidXV3YnFjd3ZzY2pxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNzcwMjYsImV4cCI6MjA4ODg1MzAyNn0.fHgxkQlWjjss7DC3lL27EE6n7LWQQ0Ly3eQ_6YQRqEM"

const supabase = createClient(supabaseUrl, supabaseKey)

const btnLogin = document.getElementById("login")
const mensagem = document.getElementById("mensagem")
const btnCarregar = document.getElementById("carregar")

const btnSalvarPaciente = document.getElementById("salvarPaciente")
const mensagemCadastro = document.getElementById("mensagemCadastro")

const listaPrazo = document.getElementById("listaPrazo")
const listaVencidos = document.getElementById("listaVencidos")
const listaImagem = document.getElementById("listaImagem")

const campoBusca = document.getElementById("busca")
const totalPacientes = document.getElementById("totalPacientes")
const totalVencidos = document.getElementById("totalVencidos")
const totalImagem = document.getElementById("totalImagem")

function adicionarMeses(dataString, meses) {
  const data = new Date(dataString + "T12:00:00")
  data.setMonth(data.getMonth() + meses)
  return data.toISOString().split("T")[0]
}

btnLogin.onclick = async () => {
  const email = document.getElementById("email").value.trim()
  const senha = document.getElementById("senha").value.trim()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  })

  if (error) {
    mensagem.innerText = "Erro no login: " + error.message
    return
  }

  mensagem.innerText = "Login realizado"
}

btnSalvarPaciente.onclick = async () => {
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

  const {
    data: { user }
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("pacientes").insert([
    {
      nome: nome,
      registro_hospitalar: registro,
      telefone: telefone,
      data_colocacao: dataColocacao,
      data_3_meses: data3,
      data_6_meses: data6,
      observacoes: observacoes,
      status: "ativo",
      cadastrado_por: user?.id || null
    }
  ])

  if (error) {
    mensagemCadastro.innerText = "Erro ao salvar: " + error.message
    return
  }

  mensagemCadastro.innerText = "Paciente salvo"

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

async function retirarDJ(id) {
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
  const { data, error } = await supabase
    .from("pacientes")
    .select("*")
    .order("data_colocacao", { ascending: false })

  if (error) {
    alert("Erro ao carregar pacientes: " + error.message)
    return
  }

  listaPrazo.innerHTML = ""
  listaVencidos.innerHTML = ""
  listaImagem.innerHTML = ""

  let contPacientes = 0
  let contVencidos = 0
  let contImagem = 0

  const hoje = new Date()

  data.forEach((p) => {
    if (p.data_retirada) return

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
      Observações: ${p.observacoes || "-"}<br><br>
      <button onclick="retirarDJ('${p.id}')">DJ retirado</button>
    `

    destino.appendChild(div)
  })

  totalPacientes.innerText = contPacientes
  totalVencidos.innerText = contVencidos
  totalImagem.innerText = contImagem

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

window.retirarDJ = retirarDJ
