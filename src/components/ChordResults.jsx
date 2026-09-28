// src/components/ChordResults.jsx
// Lista de resultados da busca de cifras. Cada resultado aponta para a
// fonte original (Cifra Club, Vagalume, Google) — o Riff Theory nunca
// reproduz o conteúdo da cifra em si, só ajuda a encontrar e abrir a fonte.

import React from "react";
import PrettyPanel from "./PrettyPanel";
import { registrarAcessoCifra } from "../utils/recentAccess";

export default function ChordResults({ resultados }) {
    if (!resultados || resultados.length === 0) {
        return (
            <PrettyPanel>
                <span style={{ opacity: 0.65 }}>
                    Nenhum resultado encontrado.
                </span>
            </PrettyPanel>
        );
    }

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "14px"
        }}>
            {resultados.map((r, i) => (
                <PrettyPanel key={i}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "12px"
                    }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>
                                {r.title}
                            </div>
                            <div style={{ fontSize: "12px", opacity: 0.65 }}>
                                Fonte: {r.source}
                            </div>
                        </div>

                        <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="highlight"
                            onClick={() => registrarAcessoCifra(r)}
                            style={{
                                textDecoration: "none",
                                padding: "8px 14px",
                                borderRadius: "8px",
                                whiteSpace: "nowrap"
                            }}
                        >
                            Abrir →
                        </a>
                    </div>
                </PrettyPanel>
            ))}
        </div>
    );
}