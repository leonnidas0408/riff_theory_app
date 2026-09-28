// index.js
// Ponto de entrada legado: carrega os dados estáticos (escalas, formas de
// acorde etc.) embutidos no HTML e liga o evento de tecla Enter no campo de busca,
// quando esse campo existir no DOM.
// As funções chamadas aqui (gerar...) estão em draw.js,
// e as funções de cálculo (parsear, calcEscala...) estão em util.js.
//
// OBS: a inicialização do braço (canvas #braco) NÃO acontece mais aqui.
// Isso agora é responsabilidade do Braco.jsx (React), que chama
// atualizarBraco() via useEffect depois que o canvas é montado.

// getResource em resources.js — lê e faz JSON.parse dos blocos <script type="application/json">
// definidos no final do index.html, mantendo os dados fora do código JS.
const NOTAS = getResource("NOTAS");       // ["C","C#","D",...] — as 12 notas cromáticas
const ESCALAS = getResource("ESCALAS");   // nome da escala -> intervalos em semitons
const ESTILOS = getResource("ESTILOS");   // nome da escala -> estilos musicais associados
const ROMANOS = getResource("ROMANOS");   // ["I","II",...] — numerais usados no campo harmônico
const FORMAS = getResource("FORMAS");     // nome do acorde -> diagrama de posições no braço

// Apelidos/sinônimos aceitos na busca (ex: "Am" -> tipo "menor"), usados em parsear() (util.js).
// Chave "" (string vazia) cobre o caso de digitar só a nota (ex: "C") = maior por padrão.
const SIN = {
    "m": "menor",
    "min": "menor",
    "maj": "maior",
    "pent": "pentatonica_menor",
    "harm": "menor_harmonica",
    "mel": "menor_melodica",
    "": "maior"
}

// ---------- Braço interativo ----------
// Altura em semitons das cordas soltas (afinação padrão), com oitava real
// (MIDI), pra reconhecer corretamente a nota de baixo em acordes invertidos.
const OPEN_MIDI = {
    6: 40, // Mi (E2) - corda mais grave
    5: 45, // Lá (A2)
    4: 50, // Ré (D3)
    3: 55, // Sol (G3)
    2: 59, // Si (B3)
    1: 64  // Mi (E4) - corda mais aguda
}; // E2 A2 D3 G3 B3 E4

// Fórmulas de acorde (intervalos em semitons a partir da fundamental),
// usadas por reconhecerAcorde() (util.js) para identificar o que está soando no braço.
const FORMULAS = getResource("FORMULAS");

// Estado real do braço: cada corda (1=mi agudo ... 6=mi grave) está muda (muted)
// OU soando numa casa (fret; 0 = corda solta). É a "fonte da verdade" usada tanto
// para desenhar o braço quanto para reconhecer o acorde formado.
let estado = {
    1: { muted: true, fret: 0 },
    2: { muted: true, fret: 0 },
    3: { muted: true, fret: 0 },
    4: { muted: true, fret: 0 },
    5: { muted: true, fret: 0 },
    6: { muted: true, fret: 0 },
};
let fretStart = 0; // primeira casa da janela visível (0 = a partir da pestana)

// Permite gerar o resultado apertando Enter no campo de busca, sem precisar clicar no botão.
// Guarda com if para não quebrar caso o React ainda não tenha montado o elemento #campo
// (evita "Cannot read properties of null (reading 'addEventListener')").
const campoEl = document.getElementById("campo");
if (campoEl) {
    campoEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") gerar(); // gerar em draw.js
    });
}

// Registra o service worker (sw.js) para permitir uso offline (PWA).
// Falha silenciosamente (ex: rodando em file:// ou navegador sem suporte).
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => { });
}