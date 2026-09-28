// src/components/ChordSearch.jsx
// Componente visual + estado local da busca de cifras. Não faz nenhuma
// requisição de rede — apenas monta os resultados via buscarCifras()
// (src/utils/cifras.js) e delega a exibição para ChordResults.

import React, { useState } from "react";
import { buscarCifras } from "../utils/cifras";
import ChordResults from "./ChordResults";

export default function ChordSearch() {
    const [query, setQuery] = useState("");
    const [resultados, setResultados] = useState(null);
    const [erro, setErro] = useState("");

    function buscar() {
        const termo = query.trim();

        if (!termo) {
            setErro("Digite o nome de uma música ou artista.");
            setResultados(null);
            return;
        }

        setErro("");
        setResultados(buscarCifras(termo));
    }

    function teclaEnter(e) {
        if (e.key === "Enter") {
            buscar();
        }
    }

    return (
        <div style={{ width: "100%" }}>
            <div style={{
                width: "100%",
                display: "flex",
                gap: "8px"
            }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={teclaEnter}
                    placeholder="🔎  Buscar música, artista ou cifra..."
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    style={{
                        flex: 1,
                        height: "48px",
                        padding: "0 18px",
                        boxSizing: "border-box",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        color: "white",
                        fontSize: "15px",
                        outline: "none"
                    }}
                />

                <button
                    className="highlight"
                    onClick={buscar}
                    style={{ height: "48px" }}
                >
                    Buscar →
                </button>
            </div>

            {erro && (
                <div style={{
                    color: "var(--vermelho, #d94f3d)",
                    fontSize: "12px",
                    marginTop: "8px"
                }}>
                    {erro}
                </div>
            )}

            {resultados && <ChordResults resultados={resultados} />}
        </div>
    );
}