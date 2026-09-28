import * as util from "./util";
import ESCALAS from "./assets/constants/ESCALAS.json";
import ESTILOS from "./assets/constants/ESTILOS.json";
import FORMAS from "./assets/constants/FORMAS.json";
import NOTAS from "./assets/constants/NOTAS.json";

const OPEN_MIDI = {
    6: 40, // Mi (E2) - corda mais grave
    5: 45, // Lá (A2)
    4: 50, // Ré (D3)
    3: 55, // Sol (G3)
    2: 59, // Si (B3)
    1: 64  // Mi (E4) - corda mais aguda
}; // E2 A2 D3 G3 B3 E4

// Paleta inspirada na referência (Riff Theory): fundo transparente (o braço
// fica integrado ao fundo da página), roxo para a tônica, azul para as
// demais notas tocadas, trastes com efeito metálico/prateado.
const CORES = {
    trasteNut: "#F8F8F8",
    corda: "rgba(148,163,184,0.6)",
    inlay: "rgba(255,255,255,0.08)",
    labelCasa: "rgba(226,232,240,0.55)",
    tonica: "#a855f7",
    tonicaGlow: "rgba(168,85,247,0.65)",
    notaAtiva: "#3b82f6",
    notaAtivaGlow: "rgba(59,130,246,0.55)",
    aberta: "#4CAF76",
    muted: "#f0554c",
    headstockA: "#2b1b12",
    headstockB: "#3d2817",
};

window.estado = {
    1: { muted: true, fret: 0 },
    2: { muted: true, fret: 0 },
    3: { muted: true, fret: 0 },
    4: { muted: true, fret: 0 },
    5: { muted: true, fret: 0 },
    6: { muted: true, fret: 0 },
};

// Constantes de grade — usadas tanto no desenho (desenharBraco) quanto na
// interpretação do clique (trata), por isso precisam ser as mesmas.
const C = 6,
    F = 12,
    MX = 60,
    MY = 38;

// Largura reservada para o headstock (cabeça/tarraxas), desenhado só quando
// window.fretStart === 0. NECK_X substitui MX como margem esquerda real do
// grid de trastes — assim o espaçamento entre casas (dx) fica igual em
// qualquer janela, só "empurrado" pra direita. Se o headstock ficar cortado,
// aumente a largura (width) do <canvas> em pelo menos HEAD_W px.
const HEAD_W = 90;
const NECK_X = MX + HEAD_W;

window.fretStart = 0; // primeira casa da janela visível (0 = a partir da pestana)
// draw.js
// Camada de interação e desenho: controla a janela de trastes visível, aplica
// presets de acorde ao braço, redesenha o canvas (desenharBraco) e trata os
// cliques do usuário no braço (trata). Depende dos dados/funções de cálculo
// definidos em util.js e main.js (window.estado, window.fretStart, NOTAS, FORMAS...).

/** Desloca a janela de trastes visível (botões "‹ casa" / "casa ›"), limitada
 *  entre a casa 0 (pestana) e a casa 12 — já que a janela mostra F=12 casas,
 *  fretStart=12 cobre as casas 13-24, a última janela possível. */
export function moverJanela(delta) {
    window.fretStart = Math.max(0, Math.min(12, window.fretStart + delta));
    window.estado = util.estadoPadrao(window.fretStart);
    atualizarBraco();
}

/** Abafa todas as cordas, mantendo a janela de trastes atual (botão "limpar"). */
export function limparBraco() {
    window.estado = util.estadoPadrao(window.fretStart);
    atualizarBraco();
}

/** Carrega uma forma pré-cadastrada (chips de escala / campo harmônico).
 *  `key` é o nome do acorde (ex: "C", "Am") usado como chave em FORMAS.
 *  Se não houver diagrama cadastrado para essa chave, apenas reseta o braço
 *  na casa aberta (window.fretStart = 0). */
export function carregarPreset(key) {
    window.estado = util.estadoPadrao(window.fretStart);
    if (FORMAS[key]) {
        const { c: casas, i: inicio } = FORMAS[key];
        window.fretStart = inicio || 0; // "i" define a janela (posição/pestana) recomendada para a forma
        casas.forEach(([corda, casa]) => {
            window.estado[corda] = { muted: false, fret: casa };
        });
    } else {
        window.fretStart = 0;
    }
    atualizarBraco();
}

/**
 * Sincroniza a UI textual do braço (nome do acorde reconhecido, notas soando,
 * rótulo da janela de trastes) com o window.estado atual e redesenha o canvas.
 * Deve ser chamada sempre que `window.estado` ou `window.fretStart` mudam.
 *
 * OBS: os elementos "braco-nome", "braco-notas" e "braco-janela" são opcionais
 * — nem toda tela que usa o <Braco /> precisa desse texto auxiliar. Por isso
 * cada getElementById é checado antes de setar textContent, evitando
 * "Cannot read properties of null" quando esses elementos não existem ainda
 * (ex: no primeiro useEffect, antes do resto da Home terminar de montar) ou
 * simplesmente não existem na página. Isso NÃO afeta desenharBraco(r), que
 * sempre roda.
 */
export function atualizarBraco() {
    const r = util.reconhecerAcorde();
    console.log(r);

    const nomeEl = document.getElementById("braco-nome");
    if (nomeEl) {
        nomeEl.textContent = r.label ?? (r.notas.length ? "Não identificado" : "—");
    }

    const notasEl = document.getElementById("braco-notas");
    if (notasEl) {
        notasEl.textContent = r.notas.length ? r.notas.join(" · ") : "";
    }

    const janelaEl = document.getElementById("braco-janela");
    if (janelaEl) {
        janelaEl.textContent =
            window.fretStart === 0
                ? "Aberta"
                : `${window.fretStart + 1}ª–${window.fretStart + F}ª casa`;
    }

    desenharBraco(r);
}

/**
 * Renderiza os "chips" do campo harmônico (graus I a VII) no card correspondente,
 * a partir da escala calculada. Cada chip é clicável quando existe um diagrama
 * de acorde cadastrado em FORMAS para aquele grau, permitindo carregar a forma
 * no braço interativo. Escalas que não formam campo harmônico tradicional
 * (não têm 7 notas) mostram uma mensagem explicativa em vez dos chips.
 */
export function montarCampoHarmonico(nota, tipo) {
    const cont = document.getElementById("r-campo");
    cont.innerHTML = "";
    const campo = util.calcCampoHarmonico(nota, tipo);

    if (!campo) {
        cont.innerHTML =
            '<div class="card-valor italic">Campo harmônico automático disponível para escalas de 7 notas (esta escala tem ' +
            ESCALAS[tipo].length +
            ").</div>";
        return null;
    }

    campo.forEach((g, idx) => {
        const item = document.createElement("div");
        item.className = "grau-item";

        const num = document.createElement("div");
        num.className = "grau-num";
        num.textContent = g.romano;

        // Diagramas em FORMAS só existem para tríades maiores ("C") e menores ("Am"),
        // por isso a chave é montada como raiz+"m" apenas quando a qualidade é menor.
        const temDiagrama = !!FORMAS[g.raiz + (g.qualidade === "m" ? "m" : "")];

        const chip = document.createElement("button");
        chip.className =
            "chip" +
            (idx === 0 ? " ativo" : "") +
            (temDiagrama ? "" : " indisponivel");
        chip.textContent = g.simbolo;

        if (temDiagrama) {
            chip.onclick = () => {
                cont
                    .querySelectorAll(".chip")
                    .forEach((c) => c.classList.remove("ativo"));
                chip.classList.add("ativo");
                carregarPreset(g.raiz + (g.qualidade === "m" ? "m" : ""));
            };
        }

        item.appendChild(num);
        item.appendChild(chip);
        cont.appendChild(item);
    });

    return campo;
}

/**
 * Handler principal, chamado ao clicar em "GERAR" ou pressionar Enter no campo de busca.
 * Fluxo:
 *  1. Faz o parsing do texto digitado (parsear, em util.js); mostra erro se inválido.
 *  2. Calcula e exibe as notas da escala e o estilo musical associado.
 *  3. Monta o campo harmônico (chips de graus I-VII) quando aplicável.
 *  4. Carrega automaticamente no braço interativo o primeiro acorde do campo
 *     harmônico que tenha diagrama cadastrado (ou a primeira nota da escala
 *     com diagrama, para escalas sem campo harmônico tradicional).
 */
export function gerar() {
    const txt = document.getElementById("campo").value;
    const res = util.parsear(txt);
    if (!res) {
        document.getElementById("erro").textContent =
            "⚠ inválido. Ex: C maior | Am | G blues | F# menor_harmonica";
        return;
    }
    document.getElementById("erro").textContent = "";

    const [nota, tipo] = res;
    const notas = util.calcEscala(nota, tipo);

    document.getElementById("r-escala").textContent = notas.join(" · ");
    document.getElementById("r-estilo").textContent =
        ESTILOS[tipo] ?? "Vários estilos";

    const campo = montarCampoHarmonico(nota, tipo);

    document.getElementById("resultado").style.display = "flex";

    // escolhe o primeiro grau com diagrama disponível pra abrir o braço
    let inicial = null;
    if (campo) {
        const primeiroComDiagrama = campo.find(
            (g) => FORMAS[g.raiz + (g.qualidade === "m" ? "m" : "")],
        );
        if (primeiroComDiagrama)
            inicial =
                primeiroComDiagrama.raiz +
                (primeiroComDiagrama.qualidade === "m" ? "m" : "");
    } else {
        // escalas sem campo harmônico (pentatônicas, blues etc.): usa a 1ª nota com diagrama
        inicial = notas.find((n) => FORMAS[n]) ?? null;
    }
    if (inicial) carregarPreset(inicial);
    else limparBraco();
}

/**
 * Desenha o headstock (cabeça da guitarra) à esquerda da pestana, no estilo
 * "6 em linha" (tipo Fender): corpo em forma de raquete afunilando para uma
 * ponta arredondada, com 6 tarraxas metálicas alinhadas às cordas — cada uma
 * com um post (onde a corda enrola) e uma chave saindo para o lado.
 * Só é chamado quando window.fretStart === 0 (ver desenharBraco).
 */
function desenharHeadstock(ctx, UH) {
    const topY = MY - 22;
    const botY = MY + UH + 22;
    const tipX = NECK_X - HEAD_W;
    const dy = UH / (C - 1);

    ctx.save();

    // corpo do headstock (forma de raquete, afunilando pra ponta arredondada)
    const grad = ctx.createLinearGradient(tipX, 0, NECK_X, 0);
    grad.addColorStop(0, CORES.headstockA);
    grad.addColorStop(1, CORES.headstockB);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.moveTo(NECK_X, MY - 6);
    ctx.lineTo(NECK_X, MY + UH + 6);
    ctx.quadraticCurveTo(tipX + HEAD_W * 0.55, botY, tipX + 16, botY - 12);
    ctx.quadraticCurveTo(tipX - 4, MY + UH / 2, tipX + 16, topY + 12);
    ctx.quadraticCurveTo(tipX + HEAD_W * 0.55, topY, NECK_X, MY - 6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // tarraxas: uma por corda, alinhada com a mesma linha (y) da corda no braço
    const postX = tipX + HEAD_W * 0.3;
    for (let i = 0; i < C; i++) {
        const y = MY + i * dy;

        // trecho da corda entre a pestana e o post da tarraxa
        ctx.strokeStyle = CORES.corda;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(NECK_X, y);
        ctx.lineTo(postX, y);
        ctx.stroke();

        // post metálico (onde a corda enrola)
        const postGrad = ctx.createLinearGradient(postX - 4, 0, postX + 4, 0);
        postGrad.addColorStop(0, "#fdfdfd");
        postGrad.addColorStop(0.5, "#8b8b8b");
        postGrad.addColorStop(1, "#fdfdfd");
        ctx.fillStyle = postGrad;
        ctx.beginPath();
        ctx.arc(postX, y, 4, 0, Math.PI * 2);
        ctx.fill();

        // chave da tarraxa, saindo para a esquerda
        ctx.strokeStyle = "#c9c9c9";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(postX - 4, y);
        ctx.lineTo(postX - 14, y);
        ctx.stroke();

        ctx.fillStyle = "#e8e8e8";
        ctx.beginPath();
        ctx.arc(postX - 14, y, 2.5, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

/**
 * Desenha o braço da guitarra no <canvas id="braco"> usando a Canvas API 2D.
 * Recebe `reconhecido` (retorno de util.reconhecerAcorde) para colorir cada nota
 * conforme sua função no acorde (fundamental, terça, quinta...) via corDoGrau.
 * Redesenha tudo do zero a cada chamada (sem otimização incremental), o que é
 * suficiente dado o tamanho pequeno do canvas e a baixa frequência de eventos.
 */
export function desenharBraco(reconhecido) {
    const canvas = document.getElementById("braco");
    const ctx = canvas.getContext("2d");
    const W = canvas.width,
        H = canvas.height;

    // Área útil do braço. NECK_X (MX + HEAD_W) é a margem esquerda real —
    // reserva espaço fixo pro headstock mesmo quando ele não está desenhado,
    // assim dx/dy não mudam ao rolar a janela de trastes.
    const UW = W - NECK_X - MX;
    const UH = H - (MY * 2);

    // Espaçamentos
    const dx = UW / F;          // distância entre casas
    const dy = UH / (C - 1);    // distância entre cordas

    // fundo transparente: só limpa o canvas, sem preencher retângulo — o
    // braço fica integrado à cor de fundo da própria página (definida no
    // CSS do container do canvas).
    ctx.clearRect(0, 0, W, H);

    // headstock (cabeça/tarraxas) — só faz sentido na posição aberta,
    // onde a pestana real (casa 0) está visível.
    if (window.fretStart === 0) {
        desenharHeadstock(ctx, UH);
    }

    // marcadores de casa (inlays) nos trastes 3,5,7,9,12...
    ctx.fillStyle = CORES.inlay;
    for (let i = 0; i < F; i++) {
        const fretAbs = window.fretStart + i + 1;
        const mod = fretAbs % 12;
        const x = NECK_X + (i + 0.5) * dx;
        if ([3, 5, 7, 9].includes(mod)) {
            ctx.beginPath();
            ctx.arc(x, MY + UH / 2, 4, 0, Math.PI * 2);
            ctx.fill();
        } else if (mod === 0) {
            const y = MY + UH / 2;

            ctx.beginPath();
            ctx.arc(x - 12, y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x + 12, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // números da casa abaixo do braço, como na referência (só nas
        // posições de inlay, pra não poluir)
        if ([3, 5, 7, 9, 12].includes(mod) || (mod === 0 && fretAbs > 0)) {
            ctx.fillStyle = CORES.labelCasa;
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(String(fretAbs), x, MY + UH + 10);
            ctx.fillStyle = CORES.inlay;
        }
    }

    // indicador da casa inicial da janela
    if (window.fretStart > 0) {
        ctx.fillStyle = "#3a67c9";
        ctx.font = "bold 11px Courier New";
        ctx.textAlign = "right";
        ctx.fillText(window.fretStart + "ª", NECK_X - 8, MY + dy * 0.65);
    }

    // trastes metálicos (braço deitado)
    for (let i = 0; i <= F; i++) {

        const x = NECK_X + i * dx;
        const ehNut = i === 0 && window.fretStart === 0;

        if (ehNut) {

            // Pestana
            ctx.strokeStyle = CORES.trasteNut;
            ctx.lineWidth = 8;

            ctx.beginPath();
            ctx.moveTo(x, MY);
            ctx.lineTo(x, MY + UH);
            ctx.stroke();

        } else {

            // sombra
            ctx.strokeStyle = "#151515";
            ctx.lineWidth = 3;

            ctx.beginPath();
            ctx.moveTo(x + 1, MY);
            ctx.lineTo(x + 1, MY + UH);
            ctx.stroke();

            // metal
            const grad = ctx.createLinearGradient(x - 2, 0, x + 2, 0);
            grad.addColorStop(0, "#fdfdfd");
            grad.addColorStop(0.25, "#d9d9d9");
            grad.addColorStop(0.5, "#8b8b8b");
            grad.addColorStop(0.75, "#d9d9d9");
            grad.addColorStop(1, "#ffffff");

            ctx.strokeStyle = grad;
            ctx.lineWidth = 2;

            ctx.beginPath();
            ctx.moveTo(x, MY);
            ctx.lineTo(x, MY + UH);
            ctx.stroke();
        }
    }

    // cordas horizontais (mais grossas nas graves, translúcidas e uniformes)
    for (let i = 0; i < C; i++) {
        const corda = C - i;
        const y = MY + i * dy;

        ctx.strokeStyle = CORES.corda;
        ctx.lineWidth = 0.9 + corda * 0.22;

        ctx.beginPath();
        ctx.moveTo(NECK_X, y);
        ctx.lineTo(NECK_X + UW, y);
        ctx.stroke();
    }

    const root = reconhecido ? reconhecido.rootPc : null;


    // pestana automática: quando 3+ cordas soam na mesma casa, desenha a barra
    const porCasa = {};

    for (let corda = 1; corda <= 6; corda++) {
        const st = window.estado[corda];

        if (!st.muted && st.fret > 0) {
            (porCasa[st.fret] ??= []).push(corda);
        }
    }

    Object.entries(porCasa).forEach(([casaStr, cordas]) => {

        if (cordas.length < 3) return;

        const casa = Number(casaStr);
        const rel = casa - window.fretStart;

        if (rel < 0 || rel > F) return;

        // FIX: rel=1 corresponde ao 1º espaço visível (índice 0), não ao
        // 2º — por isso -0.5 (equivalente a (rel-1)+0.5) em vez de +0.5.
        const x = NECK_X + (rel - 0.5) * dx;

        const ys = cordas.map((c) => C - c);

        const y1 = MY + Math.min(...ys) * dy;
        const y2 = MY + Math.max(...ys) * dy;

        ctx.fillStyle = "rgba(168,85,247,0.22)";

        ctx.beginPath();
        ctx.roundRect(
            x - 11,
            y1 - 11,
            22,
            y2 - y1 + 22,
            11
        );
        ctx.fill();
    });

    // Para cada uma das 6 cordas, desenha os estados possíveis
    for (let corda = 1; corda <= 6; corda++) {

        const st = window.estado[corda];
        const xi = C - corda;
        const y = MY + xi * dy;

        if (st.muted) {
            ctx.strokeStyle = CORES.muted;
            ctx.lineWidth = 1.8;

            const x = NECK_X - 16;
            const s = 6;

            ctx.beginPath();
            ctx.moveTo(x - s, y - s);
            ctx.lineTo(x + s, y + s);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(x + s, y - s);
            ctx.lineTo(x - s, y + s);
            ctx.stroke();

            continue;
        }

        const pc = (((OPEN_MIDI[corda] + st.fret) % 12) + 12) % 12;
        const nomeNota = NOTAS[pc];
        const ehTonica = root !== null && pc === root;

        if (st.fret === 0) {

            ctx.strokeStyle = CORES.aberta;
            ctx.lineWidth = 2.2;

            ctx.beginPath();
            ctx.arc(NECK_X - 25, y, 8, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = CORES.aberta;
            ctx.font = "bold 8px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(nomeNota, NECK_X - 25, y);

            continue;
        }

        const rel = st.fret - window.fretStart;

        if (rel < 0 || rel > F) continue;

        // FIX: mesma correção — rel=1 é o 1º espaço visível (índice 0),
        // por isso -0.5 em vez de +0.5. Sem isso, com o fret já corrigido
        // em trata(), a bolinha apareceria uma casa à frente de onde foi
        // clicado.
        const x = NECK_X + (rel - 0.5) * dx;

        // cor: tônica em roxo, demais notas ativas em azul — igual à
        // legenda da referência. Se houver info de grau (corDoGrau),
        // ela ainda prevalece para notas que não são a tônica.
        let cor = ehTonica ? CORES.tonica : CORES.notaAtiva;
        if (root !== null && !ehTonica) {
            cor = util.corDoGrau(root, pc) ?? CORES.notaAtiva;
        }

        // halo/glow sutil atrás da nota
        ctx.save();
        ctx.shadowColor = ehTonica ? CORES.tonicaGlow : CORES.notaAtivaGlow;
        ctx.shadowBlur = 14;

        ctx.fillStyle = cor;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#0D0D0D";
        ctx.font = "bold 9px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(nomeNota, x, y);

    }
}


/**
 * Handler de clique no canvas do braço (chamado a partir do listener em main.js).
 * Converte a posição do clique (em coordenadas de tela) para coordenadas do
 * canvas (considerando o escalonamento CSS x pixels reais) e delega a
 * coordParaCasa (util.js) para descobrir qual corda/casa foi tocada.
 * - Clique no "cabeçalho" da corda: alterna entre abafada -> solta -> abafada.
 * - Clique numa casa: alterna entre tocada naquela casa e abafada (toggle);
 *   clique na casa 0 é ignorado aqui (a corda solta só se ativa pelo cabeçalho).
 */
export function trata(clientX, clientY) {

    const canvas = document.getElementById("braco");
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;


    const UW = canvas.width - NECK_X - MX;
    const UH = canvas.height - (MY * 2);

    const dx = UW / F;
    const dy = UH / (C - 1);


    // braço deitado:
    // x define a casa
    // y define a corda

    const corda = Math.floor((y - MY + dy / 2) / dy);
    const casa = Math.floor((x - NECK_X) / dx);


    if (corda < 0 || corda >= C) return;


    const numeroCorda = C - corda;
    const st = window.estado[numeroCorda];


    // clique no cabeçalho da corda (lado esquerdo, agora considerando o headstock)
    if (x < NECK_X) {

        if (st.muted) {
            st.muted = false;
            st.fret = 0;

        } else if (st.fret === 0) {

            st.muted = true;

        } else {

            st.muted = true;
            st.fret = 0;
        }

    } 
    
    // clique em uma casa
    else {

        if (casa < 0 || casa >= F) return;

        // FIX: `casa` é o índice do ESPAÇO clicado (0 = espaço entre a
        // pestana/traste anterior e o 1º traste da janela), que corresponde
        // à casa física fretStart + casa + 1 — faltava o +1. Sem ele, a
        // casa 1 virava fret=0 (rejeitada pelo "fret < 1" abaixo, por isso
        // não funcionava) e todas as outras casas ficavam 1 semitom abaixo
        // do correto (por isso G soava como F#).
        const fret = window.fretStart + casa + 1;

        if (fret < 1) return;


        if (!st.muted && st.fret === fret) {

            st.muted = true;
            st.fret = 0;

        } else {

            st.muted = false;
            st.fret = fret;
        }
    }


    atualizarBraco();
}