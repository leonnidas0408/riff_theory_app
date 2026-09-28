// scripts/build-knowledge.mjs
//
// Roda localmente (NÃO na Vercel): lê tudo que estiver em /knowledge-source
// (PDFs, .txt, .md), extrai o texto, quebra em pedaços (chunks) menores e
// salva em api/knowledge-chunks.json. É esse JSON que a função serverless
// (api/chat.js) lê em tempo de execução pra dar contexto à IA — assim o
// servidor não precisa processar PDF nenhum ao vivo, só ler um JSON pronto.
//
// Uso:
//   1. Coloque seus PDFs/textos de teoria musical dentro de knowledge-source/
//      (pode criar subpastas à vontade).
//   2. Rode: npm run build:knowledge
//   3. Confira se api/knowledge-chunks.json foi gerado/atualizado.
//   4. Faça commit do knowledge-chunks.json e dê deploy normalmente.
//
// Sempre que adicionar/trocar arquivos em knowledge-source/, rode de novo.

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PASTA_ORIGEM = path.join(__dirname, "..", "knowledge-source");
const ARQUIVO_SAIDA = path.join(__dirname, "..", "api", "knowledge-chunks.json");

const TAMANHO_CHUNK = 1000; // caracteres por pedaço
const SOBREPOSICAO = 150; // caracteres repetidos entre pedaços consecutivos

function listarArquivos(pasta) {
    let resultado = [];

    let entradas;
    try {
        entradas = readdirSync(pasta);
    } catch {
        return resultado;
    }

    for (const entrada of entradas) {
        if (entrada.startsWith(".")) continue;
        if (entrada.toLowerCase() === "readme.md") continue;

        const caminhoCompleto = path.join(pasta, entrada);
        const info = statSync(caminhoCompleto);

        if (info.isDirectory()) {
            resultado = resultado.concat(listarArquivos(caminhoCompleto));
        } else {
            resultado.push(caminhoCompleto);
        }
    }

    return resultado;
}

async function extrairTexto(caminhoArquivo) {
    const extensao = path.extname(caminhoArquivo).toLowerCase();

    if (extensao === ".txt" || extensao === ".md") {
        return readFileSync(caminhoArquivo, "utf-8");
    }

    if (extensao === ".pdf") {
        // Import dinâmico: só exige o pacote pdf-parse instalado se você
        // realmente tiver PDFs pra processar.
        const { default: pdfParse } = await import("pdf-parse");
        const buffer = readFileSync(caminhoArquivo);
        const dados = await pdfParse(buffer);
        return dados.text;
    }

    return null; // extensão não suportada, ignora
}

function limparTexto(texto) {
    return texto
        .replace(/\r\n/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function quebrarEmChunks(texto, fonte) {
    const limpo = limparTexto(texto);
    const chunks = [];

    let inicio = 0;
    let indice = 0;

    while (inicio < limpo.length) {
        const fim = Math.min(inicio + TAMANHO_CHUNK, limpo.length);
        const trecho = limpo.slice(inicio, fim).trim();

        if (trecho.length > 40) {
            chunks.push({
                id: `${fonte}__${indice}`,
                source: fonte,
                text: trecho,
            });
            indice++;
        }

        if (fim >= limpo.length) break;
        inicio = fim - SOBREPOSICAO;
    }

    return chunks;
}

async function main() {
    const arquivos = listarArquivos(PASTA_ORIGEM);

    if (arquivos.length === 0) {
        console.log(
            "Nenhum arquivo encontrado em knowledge-source/. " +
                "Coloque seus PDFs/textos lá e rode este script de novo."
        );
        writeFileSync(ARQUIVO_SAIDA, "[]", "utf-8");
        return;
    }

    let todosOsChunks = [];

    for (const arquivo of arquivos) {
        const nomeFonte = path.relative(PASTA_ORIGEM, arquivo);

        try {
            const texto = await extrairTexto(arquivo);

            if (!texto) {
                console.log(`Ignorado (extensão não suportada): ${nomeFonte}`);
                continue;
            }

            const chunks = quebrarEmChunks(texto, nomeFonte);
            todosOsChunks = todosOsChunks.concat(chunks);

            console.log(`✓ ${nomeFonte} → ${chunks.length} trecho(s)`);
        } catch (err) {
            console.error(`✗ Erro ao processar ${nomeFonte}:`, err.message);
        }
    }

    writeFileSync(
        ARQUIVO_SAIDA,
        JSON.stringify(todosOsChunks, null, 2),
        "utf-8"
    );

    console.log(
        `\nPronto! ${todosOsChunks.length} trecho(s) salvos em ` +
            path.relative(path.join(__dirname, ".."), ARQUIVO_SAIDA)
    );
}

main();
