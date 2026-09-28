import React from "react";
import { gerar } from "../draw";

export default function NotaEEscala() {

    function teclaEnter(e) {
        if (e.key === "Enter") {
            gerar();
        }
    }

    return (
        <div className="entrada">
            <label>Nota e escala</label>

            <div className="row">
                <input 
                    type="text"
                    id="campo"
                    placeholder="Ex: C maior | Am | G blues | F# menor"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    onKeyDown={teclaEnter}
                />

                <button 
                    className="highlight" 
                    onClick={gerar}
                >
                    GERAR →
                </button>
            </div>

            <div className="erro" id="erro"></div>
        </div>
    )
}