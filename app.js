/* =====================================================
   CONTROLE FINANCEIRO FAMILIAR — V1
   (DATA/HORA EM TEMPO REAL + EDIÇÃO + MÁSCARA INTELIGENTE)
===================================================== */

"use strict";

/* =====================================================
   1. CONSTANTES & CONFIGURAÇÕES
===================================================== */
const STORAGE_KEY = "controle_financeiro_familiar_v1";

const CONFIG = {
    categorias: [
        "Espetaria",
        "Contas da família",
        "Cartões",
        "Pessoal",
        "Carro",
        "Outros"
    ],
    pessoas: [
        "Pai",
        "Mãe",
        "Você",
        "Irmã",
        "Funcionária"
    ],
    formasPagamento: [
        "Pix",
        "Dinheiro",
        "Débito",
        "Crédito",
        "Transferência",
        "Outro"
    ],
    origens: [
        "Espetaria",
        "Outros"
    ]
};

const DADOS_INICIAIS = {
    entradas: [],
    gastos: [],
    contas: [],
    cartoes: []
};

/* =====================================================
   2. ESTADO DA APLICAÇÃO (STATE)
===================================================== */
const dataAtual = new Date();

let state = {
    dados: carregarDados(),
    anoReferencia: dataAtual.getFullYear(), // Ano atual do sistema
    mesReferencia: dataAtual.getMonth()     // Mês atual do sistema (0 a 11)
};

function carregarDados() {
    try {
        const salvos = localStorage.getItem(STORAGE_KEY);
        return salvos ? JSON.parse(salvos) : structuredClone(DADOS_INICIAIS);
    } catch {
        return structuredClone(DADOS_INICIAIS);
    }
}

function salvarEstado() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.dados));
}

/* =====================================================
   3. UTILITÁRIOS DE FORMATAÇÃO E DATA/HORA
===================================================== */
const formatadorMoeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

function dinheiro(valor) {
    return formatadorMoeda.format(Number(valor) || 0);
}

function gerarId() {
    return Date.now() + Math.random();
}

function escaparHTML(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function obterChaveMesAtual() {
    const ano = state.anoReferencia;
    const mes = String(state.mesReferencia + 1).padStart(2, "0");
    return `${ano}-${mes}`;
}

function formatarDataBR(dataStr) {
    if (!dataStr) return "";
    const [ano, mes, dia] = dataStr.split("-");
    return dia && mes && ano ? `${dia}/${mes}/${ano}` : dataStr;
}

// Data e Hora automáticas do momento atual
function dataHojeInput() {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function horaAtualInput() {
    const agora = new Date();
    const horas = String(agora.getHours()).padStart(2, "0");
    const minutos = String(agora.getMinutes()).padStart(2, "0");
    return `${horas}:${minutos}`;
}

// Tratamento de Moeda Inteligente
function parseMoedaBR(valorStr) {
    if (!valorStr) return 0;
    const limpo = String(valorStr).trim().replace("R$", "").trim().replace(",", ".");
    return parseFloat(limpo) || 0;
}

function formatarBlurInput(inputEl) {
    const num = parseMoedaBR(inputEl.value);
    if (inputEl.value.trim() !== "") {
        inputEl.value = num.toFixed(2).replace(".", ",");
    }
}

/* =====================================================
   4. RELÓGIO EM TEMPO REAL NO TOPO
===================================================== */
function iniciarRelogio() {
    const subtitulo = document.querySelector(".subtitle");
    if (!subtitulo) return;

    function atualizar() {
        const agora = new Date();
        const dataStr = agora.toLocaleDateString("pt-BR");
        const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        subtitulo.textContent = `CONTROLE DA FAMÍLIA • ${dataStr} às ${horaStr}`;
    }

    atualizar();
    setInterval(atualizar, 1000);
}

/* =====================================================
   5. MOTOR DE CÁLCULO
===================================================== */
function calcularResumoMensal() {
    const chaveMes = obterChaveMesAtual();

    let totalEntradas = 0;
    const entradasMes = [];
    for (const ent of state.dados.entradas) {
        if (ent.data && ent.data.startsWith(chaveMes)) {
            totalEntradas += Number(ent.valor) || 0;
            entradasMes.push(ent);
        }
    }

    let gastosEspetaria = 0;
    let outrosGastos = 0;
    const gastosMes = [];
    for (const g of state.dados.gastos) {
        if (g.data && g.data.startsWith(chaveMes)) {
            const valor = Number(g.valor) || 0;
            if (g.categoria === "Espetaria") {
                gastosEspetaria += valor;
            } else {
                outrosGastos += valor;
            }
            gastosMes.push(g);
        }
    }

    let contasFixas = 0;
    for (const c of state.dados.contas) {
        if (c.ativa) {
            contasFixas += Number(c.mes) || 0;
        }
    }

    let totalCartoes = 0;
    for (const c of state.dados.cartoes) {
        const valor = (c.real === "" || c.real === null) ? c.previsao : c.real;
        totalCartoes += Number(valor) || 0;
    }

    const totalSaidas = gastosEspetaria + outrosGastos + contasFixas + totalCartoes;
    const sobra = totalEntradas - totalSaidas;

    return {
        totalEntradas,
        gastosEspetaria,
        outrosGastos,
        contasFixas,
        totalCartoes,
        totalSaidas,
        sobra,
        entradasMes,
        gastosMes
    };
}

/* =====================================================
   6. RENDERIZAÇÃO DA INTERFACE
===================================================== */
function renderMesTopo() {
    const d = new Date(state.anoReferencia, state.mesReferencia, 1);
    const texto = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const formatado = texto.charAt(0).toUpperCase() + texto.slice(1);

    document.getElementById("monthLabel").textContent = formatado.replace(" de ", " / ");
}

function renderDashboard(resumo) {
    document.getElementById("totalEntradas").textContent = dinheiro(resumo.totalEntradas);
    document.getElementById("totalSaidas").textContent = dinheiro(resumo.totalSaidas);

    const elSobra = document.getElementById("sobraLiquida");
    elSobra.textContent = dinheiro(resumo.sobra);
    elSobra.style.color = resumo.sobra >= 0 ? "var(--color-success)" : "var(--color-danger)";

    const itens = [
        { icon: "🍢", label: "Espetaria", valor: resumo.gastosEspetaria },
        { icon: "🏠", label: "Contas fixas", valor: resumo.contasFixas },
        { icon: "💳", label: "Cartões", valor: resumo.totalCartoes },
        { icon: "👤", label: "Outros", valor: resumo.outrosGastos }
    ];

    document.getElementById("resumoDespesas").innerHTML = itens.map(item => `
        <div class="summary-row">
            <span>${item.icon}</span>
            <span class="name">${item.label}</span>
            <strong>${dinheiro(item.valor)}</strong>
        </div>
    `).join("");
}

function obterLancamentosUnificados(entradasMes, gastosMes) {
    const lista = [
        ...gastosMes.map(g => ({ ...g, tipo: "Gasto" })),
        ...entradasMes.map(e => ({ ...e, tipo: "Entrada" }))
    ];
    // Ordena por data e hora decrescentes
    return lista.sort((a, b) => {
        const dataA = `${a.data}T${a.hora || "00:00"}`;
        const dataB = `${b.data}T${b.hora || "00:00"}`;
        return dataB.localeCompare(dataA);
    });
}

function renderUltimosLancamentos(lancamentos) {
    const container = document.getElementById("ultimosLancamentos");

    if (lancamentos.length === 0) {
        container.innerHTML = `<div class="empty">Nenhum lançamento neste mês.</div>`;
        return;
    }

    container.innerHTML = lancamentos.slice(0, 6).map(item => {
        const isEntrada = item.tipo === "Entrada";
        return `
            <div class="launch-row">
                <span>
                    ${formatarDataBR(item.data)}
                    ${item.hora ? `<br><small style="color:var(--color-text-light); font-size:11px;">${item.hora}</small>` : ""}
                </span>
                <span>${escaparHTML(item.descricao)}</span>
                <strong class="${isEntrada ? "income" : "expense"}">
                    ${isEntrada ? "+" : "−"} ${dinheiro(item.valor)}
                </strong>
            </div>
        `;
    }).join("");
}

function renderTodosLancamentos(lancamentos) {
    const container = document.getElementById("listaLancamentos");

    if (lancamentos.length === 0) {
        container.innerHTML = `<div class="empty">Nenhum lançamento cadastrado neste mês.</div>`;
        return;
    }

    const headerHTML = `
        <div class="launch-row table-header">
            <span>Data / Hora</span>
            <span>Descrição</span>
            <span>Valor</span>
            <span>Categoria / Origem</span>
            <span>Ações</span>
        </div>
    `;

    const rowsHTML = lancamentos.map(item => {
        const isEntrada = item.tipo === "Entrada";
        const categoriaOuOrigem = isEntrada ? item.origem : item.categoria;

        return `
            <div class="launch-row">
                <span>
                    ${formatarDataBR(item.data)}
                    ${item.hora ? `<br><small style="color:var(--color-text-light); font-size:11px;">${item.hora}</small>` : ""}
                </span>
                <span>${escaparHTML(item.descricao)}</span>
                <strong class="${isEntrada ? "income" : "expense"}">
                    ${isEntrada ? "+" : "−"} ${dinheiro(item.valor)}
                </strong>
                <span>
                    <span class="badge">${escaparHTML(categoriaOuOrigem)}</span>
                </span>
                <div class="action-buttons">
                    <button class="edit-button" 
                            data-action="editar-lancamento" 
                            data-tipo="${item.tipo}" 
                            data-id="${item.id}">
                        Editar
                    </button>
                    <button class="delete-button" 
                            data-action="excluir-lancamento" 
                            data-tipo="${item.tipo}" 
                            data-id="${item.id}">
                        Excluir
                    </button>
                </div>
            </div>
        `;
    }).join("");

    container.innerHTML = headerHTML + rowsHTML;
}

function renderCartoes() {
    const container = document.getElementById("listaCartoes");

    if (state.dados.cartoes.length === 0) {
        container.innerHTML = `<div class="empty">Nenhum cartão cadastrado. Clique no botão <strong>＋ Cartão</strong> acima para adicionar.</div>`;
        return;
    }

    const headerHTML = `
        <div class="table-row table-header">
            <span>Cartão</span>
            <span>Previsão</span>
            <span>Valor real</span>
            <span>Efetivo</span>
            <span>Ação</span>
        </div>
    `;

    const rowsHTML = state.dados.cartoes.map(cartao => {
        const efetivo = (cartao.real === "" || cartao.real === null) ? cartao.previsao : cartao.real;

        return `
            <div class="table-row">
                <strong>${escaparHTML(cartao.nome)}</strong>
                <span>${dinheiro(cartao.previsao)}</span>
                <input class="money-input input-cartao-real" 
                       type="number" 
                       step="0.01" 
                       value="${cartao.real ?? ""}" 
                       data-id="${cartao.id}">
                <strong>${dinheiro(efetivo)}</strong>
                <button class="delete-button" 
                        data-action="excluir-cartao" 
                        data-id="${cartao.id}">
                    Excluir
                </button>
            </div>
        `;
    }).join("");

    container.innerHTML = headerHTML + rowsHTML;
}

function renderContas() {
    const container = document.getElementById("listaContas");

    if (state.dados.contas.length === 0) {
        container.innerHTML = `<div class="empty">Nenhuma conta fixa cadastrada. Clique no botão <strong>＋ Conta</strong> acima para adicionar.</div>`;
        return;
    }

    const headerHTML = `
        <div class="table-row table-header">
            <span>Conta</span>
            <span>Valor padrão</span>
            <span>Este mês</span>
            <span>Ativa</span>
            <span>Ação</span>
        </div>
    `;

    const rowsHTML = state.dados.contas.map(conta => `
        <div class="table-row">
            <strong>${escaparHTML(conta.nome)}</strong>
            <span>${dinheiro(conta.padrao)}</span>
            <input class="money-input input-conta-mes" 
                   type="number" 
                   step="0.01" 
                   value="${conta.mes ?? ""}" 
                   data-id="${conta.id}">
            <label>
                <input type="checkbox" 
                       class="check-conta-ativa" 
                       data-id="${conta.id}" 
                       ${conta.ativa ? "checked" : ""}>
                Sim
            </label>
            <button class="delete-button" 
                    data-action="excluir-conta" 
                    data-id="${conta.id}">
                Excluir
            </button>
        </div>
    `).join("");

    container.innerHTML = headerHTML + rowsHTML;
}

function renderizarTudo() {
    renderMesTopo();
    const resumo = calcularResumoMensal();
    renderDashboard(resumo);

    const lancamentos = obterLancamentosUnificados(resumo.entradasMes, resumo.gastosMes);
    renderUltimosLancamentos(lancamentos);
    renderTodosLancamentos(lancamentos);
    renderCartoes();
    renderContas();
}

/* =====================================================
   7. MODAL & FORMULÁRIOS
===================================================== */
const modal = document.getElementById("modal");
const modalTitle = document.getElementById("modalTitle");
const modalForm = document.getElementById("modalForm");

function abrirModal(tipo, idEdicao = null) {
    modal.classList.remove("hidden");
    const isGasto = tipo === "gasto";
    const isEdicao = idEdicao !== null;

    let itemExistente = null;
    if (isEdicao) {
        const colecao = isGasto ? state.dados.gastos : state.dados.entradas;
        itemExistente = colecao.find(item => String(item.id) === String(idEdicao));
    }

    modalTitle.textContent = isEdicao
        ? (isGasto ? "Editar gasto" : "Editar entrada")
        : (isGasto ? "Novo gasto" : "Nova entrada");

    const dataPadrao = itemExistente ? itemExistente.data : dataHojeInput();
    const horaPadrao = itemExistente?.hora ? itemExistente.hora : horaAtualInput();
    const descPadrao = itemExistente ? itemExistente.descricao : "";
    const valorPadrao = itemExistente ? Number(itemExistente.valor).toFixed(2).replace(".", ",") : "";

    const optionsCategoria = CONFIG.categorias.map(c => `
        <option value="${c}" ${itemExistente?.categoria === c ? "selected" : ""}>${c}</option>
    `).join("");

    const optionsPessoas = CONFIG.pessoas.map(p => `
        <option value="${p}" ${itemExistente?.pessoa === p ? "selected" : ""}>${p}</option>
    `).join("");

    const optionsFormas = CONFIG.formasPagamento.map(f => `
        <option value="${f}" ${itemExistente?.forma === f ? "selected" : ""}>${f}</option>
    `).join("");

    const optionsOrigem = CONFIG.origens.map(o => `
        <option value="${o}" ${itemExistente?.origem === o ? "selected" : ""}>${o}</option>
    `).join("");

    modalForm.innerHTML = `
        <input type="hidden" name="tipo" value="${tipo}">
        <input type="hidden" name="id" value="${idEdicao ?? ""}">
        
        <div class="form-group" style="display: flex; gap: 10px;">
            <div style="flex: 2;">
                <label>Data</label>
                <input name="data" type="date" value="${dataPadrao}" required>
            </div>
            <div style="flex: 1;">
                <label>Hora</label>
                <input name="hora" type="time" value="${horaPadrao}" required>
            </div>
        </div>

        <div class="form-group">
            <label>Descrição</label>
            <input name="descricao" value="${escaparHTML(descPadrao)}" placeholder="${isGasto ? "Ex.: Carvão" : "Ex.: Venda da espetaria"}" required>
        </div>

        <div class="form-group">
            <label>Valor (R$)</label>
            <input name="valor" 
                   id="inputModalValor" 
                   type="text" 
                   inputmode="decimal" 
                   value="${valorPadrao}" 
                   placeholder="0,00" 
                   required>
        </div>

        ${isGasto ? `
            <div class="form-group">
                <label>Categoria</label>
                <select name="categoria">${optionsCategoria}</select>
            </div>
            <div class="form-group">
                <label>Pessoa</label>
                <select name="pessoa">${optionsPessoas}</select>
            </div>
            <div class="form-group">
                <label>Forma de pagamento</label>
                <select name="forma">${optionsFormas}</select>
            </div>
        ` : `
            <div class="form-group">
                <label>Origem</label>
                <select name="origem">${optionsOrigem}</select>
            </div>
        `}

        <button type="submit" class="button primary submit-button">
            ${isEdicao ? "Salvar alterações" : (isGasto ? "Salvar gasto" : "Salvar entrada")}
        </button>
    `;

    const inputValor = document.getElementById("inputModalValor");
    inputValor.addEventListener("blur", () => formatarBlurInput(inputValor));

    modalForm.onsubmit = submeterModal;
}

function fecharModal() {
    modal.classList.add("hidden");
    modalForm.innerHTML = "";
}

function submeterModal(event) {
    event.preventDefault();
    const formData = new FormData(modalForm);
    const tipo = formData.get("tipo");
    const idExistente = formData.get("id");
    const valorNumerico = parseMoedaBR(formData.get("valor"));

    if (idExistente) {
        if (tipo === "gasto") {
            const index = state.dados.gastos.findIndex(g => String(g.id) === String(idExistente));
            if (index !== -1) {
                state.dados.gastos[index] = {
                    ...state.dados.gastos[index],
                    data: formData.get("data"),
                    hora: formData.get("hora"),
                    descricao: formData.get("descricao"),
                    valor: valorNumerico,
                    categoria: formData.get("categoria"),
                    pessoa: formData.get("pessoa"),
                    forma: formData.get("forma")
                };
            }
        } else {
            const index = state.dados.entradas.findIndex(e => String(e.id) === String(idExistente));
            if (index !== -1) {
                state.dados.entradas[index] = {
                    ...state.dados.entradas[index],
                    data: formData.get("data"),
                    hora: formData.get("hora"),
                    descricao: formData.get("descricao"),
                    valor: valorNumerico,
                    origem: formData.get("origem")
                };
            }
        }
    } else {
        const itemBase = {
            id: gerarId(),
            data: formData.get("data"),
            hora: formData.get("hora") || horaAtualInput(),
            descricao: formData.get("descricao"),
            valor: valorNumerico
        };

        if (tipo === "gasto") {
            state.dados.gastos.push({
                ...itemBase,
                categoria: formData.get("categoria"),
                pessoa: formData.get("pessoa"),
                forma: formData.get("forma")
            });
        } else {
            state.dados.entradas.push({
                ...itemBase,
                origem: formData.get("origem")
            });
        }
    }

    salvarEstado();
    fecharModal();
    renderizarTudo();
}

/* =====================================================
   8. DELEGAÇÃO DE EVENTOS & INTERAÇÕES
===================================================== */
function navegarPagina(nomePagina) {
    document.querySelectorAll(".page").forEach(el => el.classList.remove("active"));
    document.getElementById(nomePagina)?.classList.add("active");

    document.querySelectorAll(".nav-button").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.page === nomePagina);
    });

    const titulos = {
        inicio: "Visão geral",
        lancamentos: "Lançamentos",
        cartoes: "Cartões",
        contas: "Contas fixas"
    };
    document.getElementById("pageTitle").textContent = titulos[nomePagina] || "Visão geral";
}

document.addEventListener("click", event => {
    const navBtn = event.target.closest("[data-page]");
    if (navBtn) {
        navegarPagina(navBtn.dataset.page);
        return;
    }

    const actionBtn = event.target.closest("[data-action]");
    if (actionBtn) {
        const action = actionBtn.dataset.action;

        if (action === "novo-gasto") return abrirModal("gasto");
        if (action === "nova-entrada") return abrirModal("entrada");

        if (action === "editar-lancamento") {
            const { tipo, id } = actionBtn.dataset;
            return abrirModal(tipo.toLowerCase(), id);
        }

        if (action === "excluir-lancamento") {
            const { tipo, id } = actionBtn.dataset;
            if (confirm(`Excluir este(a) ${tipo.toLowerCase()}?`)) {
                if (tipo === "Gasto") {
                    state.dados.gastos = state.dados.gastos.filter(g => String(g.id) !== String(id));
                } else {
                    state.dados.entradas = state.dados.entradas.filter(e => String(e.id) !== String(id));
                }
                salvarEstado();
                renderizarTudo();
            }
            return;
        }

        if (action === "excluir-cartao") {
            const { id } = actionBtn.dataset;
            if (confirm("Excluir este cartão?")) {
                state.dados.cartoes = state.dados.cartoes.filter(c => String(c.id) !== String(id));
                salvarEstado();
                renderizarTudo();
            }
            return;
        }

        if (action === "excluir-conta") {
            const { id } = actionBtn.dataset;
            if (confirm("Excluir esta conta fixa?")) {
                state.dados.contas = state.dados.contas.filter(c => String(c.id) !== String(id));
                salvarEstado();
                renderizarTudo();
            }
            return;
        }
    }
});

document.addEventListener("change", event => {
    if (event.target.classList.contains("input-cartao-real")) {
        const id = event.target.dataset.id;
        const val = event.target.value.trim();
        const cartao = state.dados.cartoes.find(c => String(c.id) === String(id));
        if (cartao) {
            cartao.real = val === "" ? "" : Number(val);
            salvarEstado();
            renderizarTudo();
        }
    }

    if (event.target.classList.contains("input-conta-mes")) {
        const id = event.target.dataset.id;
        const val = Number(event.target.value) || 0;
        const conta = state.dados.contas.find(c => String(c.id) === String(id));
        if (conta) {
            conta.mes = val;
            salvarEstado();
            renderizarTudo();
        }
    }

    if (event.target.classList.contains("check-conta-ativa")) {
        const id = event.target.dataset.id;
        const conta = state.dados.contas.find(c => String(c.id) === String(id));
        if (conta) {
            conta.ativa = event.target.checked;
            salvarEstado();
            renderizarTudo();
        }
    }
});

document.getElementById("previousMonth").addEventListener("click", () => {
    if (state.mesReferencia === 0) {
        state.mesReferencia = 11;
        state.anoReferencia -= 1;
    } else {
        state.mesReferencia -= 1;
    }
    renderizarTudo();
});

document.getElementById("nextMonth").addEventListener("click", () => {
    if (state.mesReferencia === 11) {
        state.mesReferencia = 0;
        state.anoReferencia += 1;
    } else {
        state.mesReferencia += 1;
    }
    renderizarTudo();
});

document.getElementById("fecharModal").addEventListener("click", fecharModal);
modal.addEventListener("click", event => {
    if (event.target.id === "modal") fecharModal();
});

document.getElementById("adicionarCartao").addEventListener("click", () => {
    const nome = prompt("Nome do cartão:");
    if (!nome) return;

    const previsao = Number(prompt("Previsão da fatura (R$):", "0")) || 0;
    state.dados.cartoes.push({
        id: gerarId(),
        nome,
        previsao,
        real: previsao,
        observacao: ""
    });

    salvarEstado();
    renderizarTudo();
});

document.getElementById("adicionarConta").addEventListener("click", () => {
    const nome = prompt("Nome da conta:");
    if (!nome) return;

    const valor = Number(prompt("Valor deste mês (R$):", "0")) || 0;
    state.dados.contas.push({
        id: gerarId(),
        nome,
        padrao: valor,
        mes: valor,
        ativa: true
    });

    salvarEstado();
    renderizarTudo();
});

/* =====================================================
   9. INICIALIZAÇÃO
===================================================== */
renderizarTudo();
iniciarRelogio();