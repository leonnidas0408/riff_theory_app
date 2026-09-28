// util.js
// Funções utilitárias "puras" (sem tocar no DOM, exceto reconhecerAcorde/corDoGrau/coordParaCasa
// que dependem de recursos globais carregados em main.js): parsing da entrada do usuário,
// cálculo de escalas, cálculo do campo harmônico e reconhecimento de acordes no braço.

/**
 * Interpreta o texto digitado pelo usuário (ex: "C maior", "Am", "G blues", "F# menor_harmonica")
 * e retorna [nota, tipoDeEscala] prontos para uso em calcEscala/calcCampoHarmonico.
 * Aceita tanto forma "colada" (ex: "Am" -> nota A, tipo menor) quanto "separada por espaço"
 * (ex: "C maior"). Retorna null se a nota ou o tipo de escala não forem reconhecidos.
 */
import ESCALAS from "./assets/constants/ESCALAS.json";
import ESTILOS from "./assets/constants/ESTILOS.json";
import FORMAS from "./assets/constants/FORMAS.json";
import FORMULAS from "./assets/constants/FORMULAS.json";
import NOTAS from "./assets/constants/NOTAS.json";
import ROMANOS from "./assets/constants/ROMANOS.json";

const OPEN_MIDI = {
    6: 40, // Mi (E2) - corda mais grave
    5: 45, // Lá (A2)
    4: 50, // Ré (D3)
    3: 55, // Sol (G3)
    2: 59, // Si (B3)
    1: 64  // Mi (E4) - corda mais aguda
}; // E2 A2 D3 G3 B3 E4

const SIN = {
    "m": "menor",
    "min": "menor",
    "maj": "maior",
    "pent": "pentatonica_menor",
    "harm": "menor_harmonica",
    "mel": "menor_melodica",
    "": "maior"
};
window.estado = {
    1: { muted: true, fret: 0 },
    2: { muted: true, fret: 0 },
    3: { muted: true, fret: 0 },
    4: { muted: true, fret: 0 },
    5: { muted: true, fret: 0 },
    6: { muted: true, fret: 0 },
};
window.fretStart = 0;

export function parsear(txt) {
    const p = txt.trim().toLowerCase().split(/\s+/);
    if (!p.length) return null;
    const raw = p[0];
    // Detecta sustenido (#) logo após a letra da nota, ex: "f#" -> "F#"
    const nota =
        raw.length > 1 && raw[1] === "#"
            ? raw.slice(0, 2).toUpperCase()
            : raw[0].toUpperCase();
    if (!NOTAS.includes(nota)) return null;
    // Caso "colado" (ex: "Am"): o que sobra depois da nota é o tipo (ex: "m")
    let tipo = raw.slice(nota.length);
    // Caso "separado por espaço" (ex: "C menor harmonica"): junta o resto das palavras com "_"
    if (p.length > 1) tipo = p.slice(1).join("_");
    // Resolve apelidos/sinônimos (m -> menor, maj -> maior, etc.) definidos em SIN (main.js)
    tipo = SIN[tipo] ?? tipo;
    if (!ESCALAS[tipo]) return null;
    return [nota, tipo];
}

/**
 * Calcula as notas de uma escala a partir da nota-fundamental e do tipo (chave em ESCALAS).
 * ESCALAS[tipo] guarda os intervalos em semitons a partir da fundamental (ex: [0,2,4,5,7,9,11]).
 * Cada intervalo é somado ao índice cromático da fundamental e o resultado é levado
 * de volta ao intervalo 0-11 com módulo 12, mapeando para o nome da nota em NOTAS.
 */
export function calcEscala(nota, tipo) {
    const i = NOTAS.indexOf(nota);
    return ESCALAS[tipo].map((p) => NOTAS[(i + p) % 12]);
}

/**
 * Campo harmônico automático.
 * Empilha terças diatonicamente (grau, grau+2, grau+4 dentro da própria escala)
 * e deduz a qualidade da tríade (M, m, dim, aum) a partir dos intervalos reais
 * entre as notas — funciona para qualquer escala de 7 notas, não só as
 * pré-cadastradas. Escalas com número de graus diferente de 7 (pentatônicas,
 * blues, tons inteiros, cromática, diminuta, aumentada) não formam um campo
 * harmônico tradicional por terças, então retornam null.
 */
export function calcCampoHarmonico(nota, tipo) {
    const intervalos = ESCALAS[tipo];
    const n = intervalos.length;
    if (n !== 7) return null;

    const notas = calcEscala(nota, tipo);
    const offset = (grau) => intervalos[grau % n] + 12 * Math.floor(grau / n);

    const campo = [];
    for (let grau = 0; grau < n; grau++) {
        const raiz = offset(grau);
        const terca = (((offset(grau + 2) - raiz) % 12) + 12) % 12;
        const quinta = (((offset(grau + 4) - raiz) % 12) + 12) % 12;

        let qualidade, sufixo, simboloExtra;
        if (terca === 4 && quinta === 7) {
            qualidade = "M";
            sufixo = "";
        } else if (terca === 3 && quinta === 7) {
            qualidade = "m";
            sufixo = "m";
        } else if (terca === 3 && quinta === 6) {
            qualidade = "dim";
            sufixo = "°";
        } else if (terca === 4 && quinta === 8) {
            qualidade = "aum";
            sufixo = "+";
        } else {
            qualidade = "?";
            sufixo = " (?)";
        }

        let romano = ROMANOS[grau];
        if (qualidade === "m" || qualidade === "dim") romano = romano.toLowerCase();
        if (qualidade === "dim") romano += "°";
        if (qualidade === "aum") romano += "+";

        campo.push({
            grau: grau + 1,
            romano,
            raiz: notas[grau],
            qualidade,
            simbolo: notas[grau] + sufixo,
        });
    }
    return campo;
}

/**
 * Cria um window.estado "limpo" para as 6 cordas do braço: todas abafadas (muted=true)
 * e na casa 0. É usado ao trocar de janela de trastes, ao limpar o braço e
 * como base antes de aplicar uma forma pré-cadastrada (FORMAS).
 * O parâmetro `inicio` não é usado no corpo da função (mantido pela assinatura
 * da chamada em draw.js), o window.estado inicial é sempre o mesmo.
 */
export function estadoPadrao(inicio) {
    const muteInicial = true; // por padrão nenhuma corda soa até o usuário tocar
    const novo = {};
    for (let c = 1; c <= 6; c++) novo[c] = { muted: muteInicial, fret: 0 };
    return novo;
}

/**
 * Reconhece o acorde formado pelo window.estado atual do braço (variável global `window.estado`).
 * Estratégia:
 *  1. Reúne as cordas que estão soando (não abafadas) com sua nota MIDI real.
 *  2. Reduz para classes de altura (pitch class, 0-11) e obtém as notas distintas.
 *  3. Descobre qual nota é o baixo (menor MIDI) para decidir se o acorde está invertido.
 *  4. Testa cada nota soante como possível fundamental, calcula os intervalos relativos
 *     a ela e compara com as fórmulas conhecidas (FORMULAS, em main.js).
 *  5. Escolhe a melhor combinação: prioriza a fundamental que coincide com o baixo
 *     (score maior) e, entre empates, a fórmula com menos notas (mais "simples").
 * Retorna { label, notas, rootPc } onde label é o nome do acorde (ex: "C", "Am/E")
 * ou null se nenhuma fórmula bater com as notas soantes.
 */
export function reconhecerAcorde() {
    const soantes = [];
    for (const cordaStr in window.estado) {
        const st = window.estado[cordaStr];
        if (st.muted) continue;
        const midi = OPEN_MIDI[cordaStr] + st.fret;
        soantes.push({ corda: +cordaStr, midi, pc: ((midi % 12) + 12) % 12 });
    }
    if (!soantes.length) return { label: null, notas: [], rootPc: null };

    const pcs = [...new Set(soantes.map((s) => s.pc))];
    const notas = pcs.map((p) => NOTAS[p]);
    // Apenas uma nota distinta soando: não dá pra formar um acorde, mostra a nota isolada
    if (pcs.length === 1) return { label: notas[0], notas, rootPc: pcs[0] };

    // Identifica a nota mais grave (menor valor MIDI) para detectar inversões (ex: C/E)
    const bassMidi = Math.min(...soantes.map((s) => s.midi));
    const bassPc = soantes.find((s) => s.midi === bassMidi).pc;

    // Testa cada nota presente como possível fundamental e compara os intervalos
    // resultantes com o catálogo de FORMULAS (tríades e tétrades comuns).
    let melhor = null;
    for (const root of pcs) {
        const intervalos = [
            ...new Set(pcs.map((p) => (((p - root) % 12) + 12) % 12)),
        ].sort((a, b) => a - b);
        for (const [nome, formula] of FORMULAS) {
            const f = [...formula].sort((a, b) => a - b);
            const igual =
                intervalos.length === f.length &&
                intervalos.every((v, i) => v === f[i]);
            if (igual) {
                // Pontuação: dobra o peso se a fundamental testada é a nota do baixo
                // (acorde "na posição fundamental"); fórmulas menores desempatam melhor.
                const score = (root === bassPc ? 2 : 1) * 100 - formula.length;
                if (!melhor || score > melhor.score) melhor = { score, root, nome };
            }
        }
    }

    if (melhor) {
        const raizNome = NOTAS[melhor.root] + melhor.nome;
        // Se a fundamental não é a nota do baixo, indica a inversão no formato "Acorde/Baixo"
        const label =
            melhor.root === bassPc ? raizNome : raizNome + "/" + NOTAS[bassPc];
        return { label, notas, rootPc: melhor.root };
    }
    return { label: null, notas, rootPc: null };
}

/**
 * Define a cor de uma nota no braço de acordo com sua função em relação à
 * fundamental (root) do acorde reconhecido — dá destaque visual (fundamental
 * em dourado, terças em verde, quintas/oitavas em branco, resto em vermelho).
 */
export function corDoGrau(root, pc) {
    const intervalo = (((pc - root) % 12) + 12) % 12;
    if (intervalo === 0) return "#C9933A"; // fundamental
    if (intervalo === 3 || intervalo === 4) return "#4CAF76"; // 3ª menor ou maior
    if (intervalo === 6 || intervalo === 7 || intervalo === 8) return "#F0F0F0"; // 4ª/5ª/6ª aumentada
    return "#D94F3D"; // demais graus (tensões, notas "de fora")
}

/**
 * Converte uma posição em pixels do canvas (x, y) na casa/corda correspondente.
 * Usado pelo handler de clique (trata, em draw.js) para saber onde o usuário tocou.
 * - Clique acima da primeira linha de trastes (y < MY-8) = clique no "cabeçalho" da
 *   corda (abre/abafa a corda solta), sinalizado por header: true.
 * - Caso contrário, arredonda para a casa mais próxima dentro da janela visível.
 * Retorna null se o clique caiu fora da área das 6 cordas.
 */
export function coordParaCasa(x, y, C, MX, MY, dx, dy, F) {
    const xi = Math.round((x - MX) / dx);
    if (xi < 0 || xi > C - 1) return null;
    const corda = C - xi; // cordas desenhadas da mais grave (esquerda) à mais aguda (direita)
    if (y < MY - 8) return { corda, header: true };
    let i = Math.round((y - MY) / dy);
    i = Math.max(0, Math.min(F, i));
    return { corda, header: false, fret: window.fretStart + i };
}