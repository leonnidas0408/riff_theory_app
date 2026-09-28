import React from "react";
import { limparBraco, moverJanela } from "../draw";
import Braco from "./Braco";

export default function Resultado() {
    return (
        <div className="resultado" id="resultado">
            <div className="card">
                <div className="card-titulo">Escala</div>
                <div className="card-valor" id="r-escala">
                    —
                </div>
            </div>

            <div className="card">
                <div className="card-titulo">Campo harmônico</div>
                <div className="campo" id="r-campo">
                    Aguardando escala...
                </div>
            </div>

            <div className="card">
                <div className="card-titulo">Estilo musical</div>
                <div className="card-valor italic" id="r-estilo">
                    —
                </div>
            </div>

            <div className="braco-card">
                <div className="braco-titulo">
                    Braço interativo
                </div>

                <div className="braco-dica">
                    Toque numa corda pra abrir/abafar · toque numa casa pra dedilhar
                </div>

                <div className="braco-header">
                    <div>
                        <div id="braco-nome">
                            Nenhuma escala selecionada
                        </div>

                        <div id="braco-notas">
                            As notas aparecerão aqui
                        </div>
                    </div>
                </div>

                <Braco/>

                <div className="braco-controles">
                    <button onClick={() => moverJanela(-1)}>
                        ‹ casa
                    </button>

                    <span id="braco-janela">
                        Aberta
                    </span>

                    <button onClick={() => moverJanela(1)}>
                        casa ›
                    </button>

                    <button 
                        className="limpar" 
                        onClick={limparBraco}
                    >
                        limpar
                    </button>
                </div>
            </div>
        </div>
    )
}