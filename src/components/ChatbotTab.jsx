import { useEffect, useRef, useState } from "react";

import "./ChatbotTab.css";

// Na web (Vercel) fica vazio e a chamada é relativa (/api/chat). Nos apps
// APK/.exe não existe servidor local, então o build "app" define VITE_API_BASE
// com a URL do deploy na Vercel (ver .env.app.example).
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

const MENSAGEM_BOAS_VINDAS = {
    autor: "bot",
    texto:
        "E aí! Eu sou o assistente do Riff Theory. Pode perguntar sobre teoria " +
        "musical, escalas, acordes, harmonia, intervalos, técnica no violão/" +
        "guitarra e afins — esse é o meu único assunto. 🎸",
};

export default function ChatbotTab() {
    const [mensagens, setMensagens] = useState([MENSAGEM_BOAS_VINDAS]);
    const [entrada, setEntrada] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState("");

    const fimDaListaRef = useRef(null);

    useEffect(() => {
        fimDaListaRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [mensagens, carregando]);

    async function enviarMensagem(evento) {
        evento.preventDefault();

        const texto = entrada.trim();
        if (!texto || carregando) return;

        const novaMensagemUsuario = { autor: "usuario", texto };
        const historicoAtualizado = [...mensagens, novaMensagemUsuario];

        setMensagens(historicoAtualizado);
        setEntrada("");
        setErro("");
        setCarregando(true);

        try {
            const resposta = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    // Manda só autor/texto pro backend remontar a conversa.
                    mensagens: historicoAtualizado.map((m) => ({
                        autor: m.autor,
                        texto: m.texto,
                    })),
                }),
            });

            if (!resposta.ok) {
                const corpoErro = await resposta.json().catch(() => ({}));
                throw new Error(
                    corpoErro.erro ||
                        "Não consegui falar com o servidor agora."
                );
            }

            const dados = await resposta.json();

            setMensagens((atual) => [
                ...atual,
                { autor: "bot", texto: dados.resposta },
            ]);
        } catch (err) {
            setErro(
                err.message ||
                    "Algo deu errado ao tentar responder. Tenta de novo."
            );
        } finally {
            setCarregando(false);
        }
    }

    return (
        <div className="chatbot-tab">
            <div className="chatbot-header">
                <h2>Chatbot de Teoria Musical</h2>
                <p>
                    Assistente com IA focado só em música e teoria musical.
                </p>
            </div>

            <div className="chatbot-mensagens">
                {mensagens.map((mensagem, indice) => (
                    <div
                        key={indice}
                        className={`chatbot-bolha chatbot-bolha-${mensagem.autor}`}
                    >
                        {mensagem.texto}
                    </div>
                ))}

                {carregando && (
                    <div className="chatbot-bolha chatbot-bolha-bot chatbot-digitando">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                )}

                <div ref={fimDaListaRef} />
            </div>

            {erro && <div className="chatbot-erro">{erro}</div>}

            <form className="chatbot-form" onSubmit={enviarMensagem}>
                <input
                    type="text"
                    value={entrada}
                    onChange={(e) => setEntrada(e.target.value)}
                    placeholder="Pergunte sobre escalas, acordes, harmonia..."
                    disabled={carregando}
                />
                <button type="submit" disabled={carregando || !entrada.trim()}>
                    Enviar
                </button>
            </form>
        </div>
    );
}
