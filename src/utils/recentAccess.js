// src/utils/recentAccess.js
// Histórico local de músicas/cifras abertas pelo usuário, usado pelo bloco
// "Últimos acessos" da Home. Não depende de backend: fica salvo no
// localStorage do navegador, limitado aos N acessos mais recentes.

const CHAVE_ARMAZENAMENTO = "riffTheoryUltimosAcessos";
const MAX_ITENS = 5;

function lerArmazenamento() {
    try {
        const bruto = localStorage.getItem(CHAVE_ARMAZENAMENTO);
        return bruto ? JSON.parse(bruto) : [];
    } catch {
        return [];
    }
}

function gravarArmazenamento(lista) {
    try {
        localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(lista));
    } catch {
        // localStorage indisponível (modo privado, quota etc.) — falha silenciosa
    }
}

/**
 * Registra o acesso a uma cifra/música. Remove duplicatas (mesmo title+source)
 * e mantém a lista ordenada do mais recente pro mais antigo, limitada a
 * MAX_ITENS.
 * @param {{ title: string, source: string, url: string }} item
 */
export function registrarAcessoCifra(item) {
    const listaAtual = lerArmazenamento();

    const semDuplicata = listaAtual.filter(
        (a) => !(a.title === item.title && a.source === item.source)
    );

    const novaLista = [
        { ...item, timestamp: Date.now() },
        ...semDuplicata,
    ].slice(0, MAX_ITENS);

    gravarArmazenamento(novaLista);
}

/**
 * @returns {Array<{ title: string, source: string, url: string, timestamp: number }>}
 */
export function obterAcessosRecentes() {
    return lerArmazenamento();
}