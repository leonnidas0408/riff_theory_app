// src/utils/cifras.js
// Camada de dados independente do sistema de busca de cifras.
// NÃO faz requisições de rede: apenas monta URLs de busca prontas para
// fontes públicas conhecidas, deixando o usuário abrir a fonte original.
// Sem scraping, sem parsing de HTML de terceiros, sem risco de CORS.
//
// OBS: as buscas de Cifra Club e Vagalume são feitas via Google restrito
// ao domínio (site:...), e não pela busca interna desses sites — a busca
// interna deles é uma SPA cujo comportamento com parâmetros de URL não é
// estável (pode cair na home ou ignorar o termo dependendo do momento).
// O Google já indexa as páginas de música desses sites e leva direto pra
// cifra específica, sem depender de rota interna nenhuma deles.

/**
 * Recebe o texto digitado pelo usuário (ex: "Tempo Perdido Legião Urbana")
 * e devolve uma lista de resultados prontos para exibição, cada um
 * apontando para a busca dessa mesma query em uma fonte pública de cifras.
 *
 * @param {string} query
 * @returns {Array<{ title: string, source: string, url: string }>}
 */
export function buscarCifras(query) {
    const termo = (query ?? "").trim();

    if (!termo) {
        return [];
    }

    const q = encodeURIComponent(termo);

    return [
        {
            title: termo,
            source: "Cifra Club",
            url: `https://www.google.com/search?q=site:cifraclub.com.br+${q}`,
        },
        {
            title: termo,
            source: "Vagalume",
            url: `https://www.google.com/search?q=site:vagalume.com.br+${q}`,
        },
        {
            title: termo,
            source: "Google",
            url: `https://www.google.com/search?q=${q}+cifra`,
        },
    ];
}

/**
 * Camada de preparação pra integração futura com o braço interativo.
 * NÃO é usada ainda em lugar nenhum — só define o formato de dados que,
 * no futuro, poderá alimentar carregarPreset() em draw.js quando a cifra
 * tiver acordes reconhecíveis (ex: "C", "G", "Am", "F").
 *
 * @param {string} chord - acorde bruto extraído de uma cifra (ex: "Am7")
 * @returns {{ chord: string, normalizedChord: string }}
 */
export function normalizarAcordeParaBraco(chord) {
    const bruto = (chord ?? "").trim();
    return {
        chord: bruto,
        normalizedChord: bruto,
    };
}