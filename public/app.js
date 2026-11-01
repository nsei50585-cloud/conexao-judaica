const $ = (id) => document.getElementById(id);
const pages = ["dashboard", "cep", "cnpj", "history"];
const titles = { dashboard: "Visão geral", cep: "Consulta de CEP", cnpj: "Consulta de CNPJ", history: "Histórico" };

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Ocorreu um erro.");
  return data;
}
function showPage(name) {
  pages.forEach(p => $(p + "Page").classList.toggle("hidden", p !== name));
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.page === name));
  $("pageTitle").textContent = titles[name];
  if (name === "history") loadHistory();
}
function field(label, value) {
  const item = document.createElement("div"); item.className = "result-item";
  const l = document.createElement("span"); l.textContent = label;
  const v = document.createElement("b"); v.textContent = value || "Não informado";
  item.append(l, v); return item;
}
function renderResult(target, title, pairs) {
  const box = $(target); box.replaceChildren();
  const h = document.createElement("h3"); h.textContent = title;
  const grid = document.createElement("div"); grid.className = "result-grid";
  pairs.forEach(([k,v]) => grid.append(field(k, String(v ?? ""))));
  box.append(h, grid); box.classList.remove("hidden");
}
function renderError(target, message) {
  const box = $(target); box.replaceChildren();
  const p = document.createElement("p"); p.className = "error"; p.textContent = message;
  box.append(p); box.classList.remove("hidden");
}
function digits(value) { return value.replace(/\D/g, ""); }

async function loadHistory() {
  const list = $("historyList"); list.replaceChildren();
  try {
    const rows = await api("/api/history");
    $("totalSearches").textContent = rows.length;
    if (!rows.length) { list.innerHTML = '<div class="empty">Nenhuma consulta realizada ainda.</div>'; return; }
    rows.forEach(row => {
      const el = document.createElement("div"); el.className = "history-row";
      const left = document.createElement("span"); left.textContent = `${row.type} · ${row.query}`;
      const right = document.createElement("b"); right.textContent = new Date(row.created_at.replace(" ", "T") + "Z").toLocaleString("pt-BR");
      el.append(left, right); list.append(el);
    });
  } catch { list.innerHTML = '<div class="empty">Não foi possível carregar o histórico.</div>'; }
}
async function refreshStats() {
  try { const rows = await api("/api/history"); $("totalSearches").textContent = rows.length; }
  catch { $("totalSearches").textContent = "0"; }
}
async function checkSession() {
  try {
    const me = await api("/api/me");
    if (me.authenticated) enterApp(me.username);
    else { $("loginView").classList.remove("hidden"); $("appView").classList.add("hidden"); }
  } catch { $("loginView").classList.remove("hidden"); }
}
function enterApp(username) {
  $("currentUser").textContent = username;
  $("loginView").classList.add("hidden"); $("appView").classList.remove("hidden");
  showPage("dashboard"); refreshStats();
}

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault(); $("loginError").textContent = "";
  const form = new FormData(e.currentTarget);
  try {
    const result = await api("/api/login", { method: "POST", body: JSON.stringify({ username: form.get("username"), password: form.get("password") }) });
    e.currentTarget.reset(); enterApp(result.username);
  } catch (err) { $("loginError").textContent = err.message; }
});
$("logoutBtn").addEventListener("click", async () => {
  try { await api("/api/logout", { method: "POST" }); } finally { $("appView").classList.add("hidden"); $("loginView").classList.remove("hidden"); }
});
document.querySelectorAll("[data-page]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.page)));
document.querySelectorAll("[data-open]").forEach(b => b.addEventListener("click", () => showPage(b.dataset.open)));

$("cepForm").addEventListener("submit", async e => {
  e.preventDefault(); const cep = digits($("cepInput").value); $("cepResult").classList.add("hidden");
  try {
    const d = await api("/api/cep/" + encodeURIComponent(cep));
    renderResult("cepResult", "Resultado da consulta", [
      ["CEP", d.cep], ["Logradouro", d.logradouro], ["Complemento", d.complemento],
      ["Bairro", d.bairro], ["Cidade", d.localidade], ["UF", d.uf], ["Estado", d.estado], ["Região", d.regiao]
    ]);
    refreshStats();
  } catch (err) { renderError("cepResult", err.message); }
});
$("cnpjForm").addEventListener("submit", async e => {
  e.preventDefault(); const cnpj = digits($("cnpjInput").value); $("cnpjResult").classList.add("hidden");
  try {
    const d = await api("/api/cnpj/" + encodeURIComponent(cnpj));
    renderResult("cnpjResult", d.razao_social || "Resultado da consulta", [
      ["CNPJ", d.cnpj], ["Nome fantasia", d.nome_fantasia], ["Razão social", d.razao_social],
      ["Situação cadastral", d.descricao_situacao_cadastral], ["Atividade principal", d.cnae_fiscal_descricao],
      ["Município", d.municipio], ["UF", d.uf], ["Data de abertura", d.data_inicio_atividade],
      ["Porte", d.porte], ["Natureza jurídica", d.natureza_juridica]
    ]);
    refreshStats();
  } catch (err) { renderError("cnpjResult", err.message); }
});
checkSession();
