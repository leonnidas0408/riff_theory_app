// src/utils/usageStats.js
// Rastreamento local de tempo de uso do Riff Theory, usado pelo gráfico
// "Semanas de uso" da Home. Não depende de backend: os minutos de uso são
// acumulados por dia no localStorage do navegador. Conta apenas enquanto a
// aba está visível (document.visibilityState === "visible"), evitando
// contar tempo em segundo plano.

const CHAVE_ARMAZENAMENTO = "riffTheoryUsoSemanal";
const INTERVALO_MS = 15000; // grava a cada 15s de uso ativo
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function lerArmazenamento() {
    try {
        const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
        return bruto ? JSON.parse(bruto) : {};
    } catch {
        return {};
    }
}

function gravarArmazenamento(dados) {
    try {
        localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(dados));
    } catch {
        // localStorage indisponível (modo privado, quota etc.) — falha silenciosa
    }
}

function chaveDoDia(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

/** Soma `minutos` ao total do dia informado (padrão: hoje). */
export function registrarUsoMinutos(minutos, data = new Date()) {
    const dados = lerArmazenamento();
    const chave = chaveDoDia(data);
    dados[chave] = (dados[chave] || 0) + minutos;
    gravarArmazenamento(dados);
}

/**
 * Retorna os últimos 7 dias (hoje incluso), do mais antigo pro mais
 * recente, no formato usado pelo gráfico da Home.
 * @returns {Array<{ label: string, minutos: number }>}
 */
export function obterUsoSemanal() {
    const dados = lerArmazenamento();
    const hoje = new Date();
    const dias = [];

    for (let i = 6; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() - i);
        const chave = chaveDoDia(data);

        dias.push({
            label: DIAS_SEMANA[data.getDay()],
            minutos: dados[chave] || 0,
        });
    }

    return dias;
}

/** Total de horas de uso nos últimos 7 dias. */
export function obterTotalHorasSemana() {
    const totalMinutos = obterUsoSemanal().reduce((soma, d) => soma + d.minutos, 0);
    return totalMinutos / 60;
}

/**
 * Inicia o rastreamento de uso (chamar uma vez, ex: useEffect em App.jsx).
 * Retorna uma função de limpeza que interrompe o rastreamento.
 */
export function iniciarRastreioDeUso() {
    const intervalId = setInterval(() => {
        if (document.visibilityState === "visible") {
            registrarUsoMinutos(INTERVALO_MS / 60000);
        }
    }, INTERVALO_MS);

    return function pararRastreioDeUso() {
        clearInterval(intervalId);
    };
}