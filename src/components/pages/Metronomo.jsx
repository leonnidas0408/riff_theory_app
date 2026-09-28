import React, { useState, useRef, useCallback, useEffect } from "react";

/* ------------------------------------------------------------------ *
 *  METRÔNOMO — Web Audio API com scheduler de lookahead.
 *
 *  Por que não um setInterval simples tocando um beep a cada X ms?
 *  O event loop do JS não é preciso (throttle de aba em background,
 *  garbage collection, etc. atrasam o callback), então um metrônomo
 *  em setInterval "arrasta" com o tempo. A técnica padrão (a mesma
 *  usada por libs de áudio sério tipo Tone.js) é: um scheduler barato
 *  roda a cada poucos ms só pra AGENDAR os próximos beats com
 *  AudioContext.currentTime (que é preciso), e o próprio Web Audio
 *  garante o timing exato de quando o som toca.
 * ------------------------------------------------------------------ */

const SCHEDULE_AHEAD_TIME = 0.1; // segundos: o quanto adiantado agendamos
const LOOKAHEAD_MS = 25;         // de quanto em quanto tempo o scheduler roda
const MIN_BPM = 30;
const MAX_BPM = 260;
const COMPASSOS = [2, 3, 4, 6];

export default function Metronomo() {
    const [bpm, setBpm] = useState(120);
    const [compasso, setCompasso] = useState(4);
    const [running, setRunning] = useState(false);
    const [beatAtivo, setBeatAtivo] = useState(-1);

    const audioCtxRef = useRef(null);
    const schedulerRef = useRef(null);
    const nextNoteTimeRef = useRef(0);
    const currentBeatRef = useRef(0);
    const bpmRef = useRef(bpm);
    const compassoRef = useRef(compasso);
    const tapTimesRef = useRef([]);

    useEffect(() => { bpmRef.current = bpm; }, [bpm]);
    useEffect(() => { compassoRef.current = compasso; }, [compasso]);

    const tocarClick = useCallback((time, acentuado) => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.frequency.value = acentuado ? 1500 : 900;
        osc.type = "sine";

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(acentuado ? 0.9 : 0.55, time + 0.002);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + 0.08);
    }, []);

    const scheduler = useCallback(() => {
        const ctx = audioCtxRef.current;
        if (!ctx) return;

        while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_TIME) {
            const beat = currentBeatRef.current;
            const acentuado = beat === 0;

            tocarClick(nextNoteTimeRef.current, acentuado);

            const delay = Math.max(0, (nextNoteTimeRef.current - ctx.currentTime) * 1000);
            const beatParaExibir = beat;
            setTimeout(() => setBeatAtivo(beatParaExibir), delay);

            const secondsPerBeat = 60.0 / bpmRef.current;
            nextNoteTimeRef.current += secondsPerBeat;
            currentBeatRef.current = (beat + 1) % compassoRef.current;
        }
    }, [tocarClick]);

    const start = useCallback(() => {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        currentBeatRef.current = 0;
        nextNoteTimeRef.current = ctx.currentTime + 0.05;

        schedulerRef.current = setInterval(scheduler, LOOKAHEAD_MS);
        setRunning(true);
    }, [scheduler]);

    const stop = useCallback(() => {
        if (schedulerRef.current) {
            clearInterval(schedulerRef.current);
            schedulerRef.current = null;
        }
        if (audioCtxRef.current) {
            audioCtxRef.current.close();
            audioCtxRef.current = null;
        }
        setRunning(false);
        setBeatAtivo(-1);
    }, []);

    useEffect(() => stop, [stop]);

    const tapTempo = () => {
        const now = performance.now();
        const taps = tapTimesRef.current.filter((t) => now - t < 2000);
        taps.push(now);
        tapTimesRef.current = taps;

        if (taps.length >= 2) {
            const intervals = [];
            for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
            const media = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const novoBpm = Math.round(60000 / media);
            setBpm(Math.min(MAX_BPM, Math.max(MIN_BPM, novoBpm)));
        }
    };

    const ajustar = (delta) => {
        setBpm((v) => Math.min(MAX_BPM, Math.max(MIN_BPM, v + delta)));
    };

    return (
        <div className="metro-wrap">
            <style>{`
                .metro-wrap {
                    width: 100%;
                    max-width: 480px;
                    margin: 40px auto;
                    padding: 0 20px;
                    box-sizing: border-box;
                }

                .metro-panel {
                    background: var(--pretty-gradient, linear-gradient(45deg, #190f1c, #000, #0f131a));
                    border: 1px solid rgba(74,141,249,.35);
                    border-radius: 26px;
                    padding: 36px 30px;
                    box-shadow:
                        0 20px 50px rgba(0,0,0,.55),
                        0 0 40px rgba(74,141,249,.18),
                        inset 0 1px 0 rgba(255,255,255,.05);
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                .metro-title {
                    font-family: "Ethnocentric", sans-serif;
                    font-size: 13px;
                    letter-spacing: 3px;
                    color: var(--cinza, #888);
                    text-transform: uppercase;
                    margin-bottom: 28px;
                }

                .metro-ring {
                    width: 220px;
                    height: 220px;
                    margin: 0 auto 24px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    background: radial-gradient(circle, rgba(74,141,249,.10), transparent 70%);
                    transition: box-shadow .08s ease, transform .08s ease;
                }

                .metro-ring.pulse {
                    box-shadow: 0 0 0 0 rgba(74,141,249,.6);
                    animation: metroPulse .18s ease-out;
                }

                .metro-ring.pulse.accent {
                    animation-name: metroPulseAccent;
                }

                @keyframes metroPulse {
                    0%   { box-shadow: 0 0 0 0 rgba(74,141,249,.55); transform: scale(1); }
                    40%  { box-shadow: 0 0 0 18px rgba(74,141,249,0); transform: scale(1.04); }
                    100% { box-shadow: 0 0 0 18px rgba(74,141,249,0); transform: scale(1); }
                }

                @keyframes metroPulseAccent {
                    0%   { box-shadow: 0 0 0 0 rgba(93,115,126,.75); transform: scale(1); }
                    40%  { box-shadow: 0 0 0 22px rgba(93,115,126,0); transform: scale(1.06); }
                    100% { box-shadow: 0 0 0 22px rgba(93,115,126,0); transform: scale(1); }
                }

                .metro-ring-inner {
                    width: 178px;
                    height: 178px;
                    border-radius: 50%;
                    border: 1px solid rgba(74,141,249,.35);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: radial-gradient(circle at 30% 20%, rgba(74,141,249,.08), var(--carvao, #000203) 70%);
                }

                .metro-bpm {
                    font-family: "Courier New", monospace;
                    font-size: 52px;
                    font-weight: 700;
                    color: var(--branco, #f0f0f0);
                    line-height: 1;
                    text-shadow: 0 0 18px rgba(74,141,249,.5);
                }

                .metro-bpm-label {
                    font-size: 11px;
                    letter-spacing: 2px;
                    color: var(--dourado, #4a8df9);
                    text-transform: uppercase;
                    margin-top: 6px;
                }

                .metro-beats {
                    display: flex;
                    justify-content: center;
                    gap: 10px;
                    margin-bottom: 26px;
                }

                .metro-beat-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: rgba(74,141,249,.15);
                    border: 1px solid rgba(74,141,249,.3);
                    transition: all .1s ease;
                }

                .metro-beat-dot.active {
                    background: var(--dourado, #4a8df9);
                    box-shadow: 0 0 10px rgba(74,141,249,.8);
                    transform: scale(1.3);
                }

                .metro-beat-dot.active.accent {
                    background: #5d737e;
                    box-shadow: 0 0 14px rgba(93,115,126,.85);
                }

                .metro-bpm-controls {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 18px;
                    margin-bottom: 22px;
                }

                .metro-bpm-btn {
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    border: 1.5px solid rgba(74,141,249,.4);
                    background: var(--carvao, #000203);
                    color: var(--dourado, #4a8df9);
                    font-size: 20px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all .15s ease;
                }

                .metro-bpm-btn:hover {
                    border-color: var(--dourado, #4a8df9);
                    box-shadow: 0 0 14px rgba(74,141,249,.4);
                }

                .metro-bpm-btn:active {
                    transform: scale(.92);
                }

                input[type="range"].metro-slider {
                    flex: 1;
                    -webkit-appearance: none;
                    height: 4px;
                    border-radius: 4px;
                    background: linear-gradient(to right, #4a8df9, #5d737e);
                    outline: none;
                }

                input[type="range"].metro-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: var(--branco, #f0f0f0);
                    border: 3px solid var(--dourado, #4a8df9);
                    cursor: pointer;
                    box-shadow: 0 0 10px rgba(74,141,249,.6);
                }

                .metro-compasso-row {
                    display: flex;
                    justify-content: center;
                    gap: 8px;
                    margin-bottom: 26px;
                }

                .metro-compasso-btn {
                    padding: 7px 14px;
                    border-radius: 20px;
                    border: 1.5px solid rgba(74,141,249,.3);
                    background: transparent;
                    color: var(--cinza, #888);
                    font-family: "Courier New", monospace;
                    font-size: 13px;
                    cursor: pointer;
                    transition: all .15s ease;
                }

                .metro-compasso-btn.active {
                    border-color: var(--dourado, #4a8df9);
                    color: var(--dourado, #4a8df9);
                    background: rgba(74,141,249,.1);
                }

                .metro-actions {
                    display: flex;
                    gap: 12px;
                }

                .metro-play {
                    flex: 1;
                    padding: 16px;
                    border-radius: 14px;
                    border: none;
                    background: linear-gradient(to right, #4a8df9, #5d737e);
                    color: var(--branco, #f0f0f0);
                    font-size: 15px;
                    font-weight: 700;
                    letter-spacing: .5px;
                    cursor: pointer;
                    transition: filter .15s ease, transform .15s ease;
                    box-shadow: 0 0 26px rgba(74,141,249,.35);
                }

                .metro-play:hover {
                    filter: brightness(1.1);
                }

                .metro-play:active {
                    transform: scale(.97);
                }

                .metro-play.stop {
                    background: linear-gradient(to right, #d94f3d, #300a39);
                }

                .metro-tap {
                    padding: 16px 20px;
                    border-radius: 14px;
                    border: 1.5px solid rgba(74,141,249,.4);
                    background: var(--carvao, #000203);
                    color: var(--dourado, #4a8df9);
                    font-size: 13px;
                    font-weight: 700;
                    letter-spacing: .5px;
                    cursor: pointer;
                    transition: all .15s ease;
                }

                .metro-tap:hover {
                    box-shadow: 0 0 16px rgba(74,141,249,.35);
                }

                .metro-tap:active {
                    transform: scale(.95);
                }
            `}</style>

            <div className="metro-panel">
                <div className="metro-title">Metrônomo</div>

                <div className={`metro-ring${beatAtivo >= 0 ? " pulse" : ""}${beatAtivo === 0 ? " accent" : ""}`}
                     key={beatAtivo + "-" + (running ? "on" : "off")}
                >
                    <div className="metro-ring-inner">
                        <div className="metro-bpm">{bpm}</div>
                        <div className="metro-bpm-label">BPM</div>
                    </div>
                </div>

                <div className="metro-beats">
                    {Array.from({ length: compasso }).map((_, i) => (
                        <div
                            key={i}
                            className={`metro-beat-dot${beatAtivo === i ? " active" : ""}${i === 0 ? " accent" : ""}`}
                        />
                    ))}
                </div>

                <div className="metro-bpm-controls">
                    <button className="metro-bpm-btn" onClick={() => ajustar(-1)}>−</button>
                    <input
                        type="range"
                        className="metro-slider"
                        min={MIN_BPM}
                        max={MAX_BPM}
                        value={bpm}
                        onChange={(e) => setBpm(Number(e.target.value))}
                    />
                    <button className="metro-bpm-btn" onClick={() => ajustar(1)}>+</button>
                </div>

                <div className="metro-compasso-row">
                    {COMPASSOS.map((c) => (
                        <button
                            key={c}
                            className={`metro-compasso-btn${compasso === c ? " active" : ""}`}
                            onClick={() => setCompasso(c)}
                        >
                            {c}/4
                        </button>
                    ))}
                </div>

                <div className="metro-actions">
                    <button
                        className={`metro-play${running ? " stop" : ""}`}
                        onClick={() => (running ? stop() : start())}
                    >
                        {running ? "Parar" : "Iniciar"}
                    </button>
                    <button className="metro-tap" onClick={tapTempo}>
                        Tap
                    </button>
                </div>
            </div>
        </div>
    );
}