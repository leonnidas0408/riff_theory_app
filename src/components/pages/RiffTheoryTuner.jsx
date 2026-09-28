import React, { useState, useRef, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ *
 *  RIFF THEORY TUNER — versão web (React + Web Audio API)
 *
 *  Portado do protótipo em Python (customtkinter + sounddevice).
 *
 *  Bugs do código original corrigidos nesta versão:
 *
 *  1) Detecção por "pico da FFT" (main.py / pitch_detector.py):
 *     pegava a frequência de maior amplitude no espectro, que em
 *     cordas de instrumento quase sempre é um HARMÔNICO, não a
 *     fundamental (ex.: uma corda grave de baixo em 41 Hz podia
 *     acender como se fosse a oitava acima). Troquei por
 *     AUTOCORRELAÇÃO (ACF2+), o método padrão em afinadores reais,
 *     que segue o período de repetição do sinal no tempo em vez do
 *     pico espectral.
 *
 *  2) O instrumento selecionado (Guitarra/Baixo/Ukulele em notes.py)
 *     nunca era usado de fato: main.py tinha uma lista de notas de
 *     guitarra fixa no código, então trocar o instrumento na tela
 *     não mudava a detecção. Aqui a corda mais próxima é calculada
 *     a partir da afinação do instrumento selecionado.
 *
 *  3) cents_to_text() em utils.py só retornava "Afinado" quando
 *     cents era EXATAMENTE 0.0 — algo que praticamente nunca
 *     acontece com áudio real, então o afinador nunca "acertava".
 *     Aqui uso uma margem de tolerância (±5 cents).
 *
 *  4) A barra de afinação em gui.py era fixa em bar.set(0.5) e nunca
 *     era atualizada com o valor real. Aqui o ponteiro do medidor é
 *     calculado a partir dos cents de desvio a cada leitura.
 *
 *  5) O limiar de volume estava duplicado e inconsistente (0.02 no
 *     main.py vs MIN_VOLUME=0.01 no config.py, nunca usado). Unifiquei
 *     num único limiar de RMS configurável.
 *
 *  6) A janela de FFT curta (2048 amostras) é curta demais para notas
 *     graves de baixo (E1 ≈ 41 Hz precisa de mais de 1000 amostras
 *     por período). Aqui o buffer de análise é maior e a busca por
 *     período é limitada à faixa de frequência plausível de um
 *     instrumento de corda, o que também deixa o cálculo mais leve.
 * ------------------------------------------------------------------ */

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const TUNINGS = {
  Guitarra: [
    { name: "E2", freq: 82.41 },
    { name: "A2", freq: 110.0 },
    { name: "D3", freq: 146.83 },
    { name: "G3", freq: 196.0 },
    { name: "B3", freq: 246.94 },
    { name: "E4", freq: 329.63 },
  ],
  Baixo: [
    { name: "E1", freq: 41.2 },
    { name: "A1", freq: 55.0 },
    { name: "D2", freq: 73.42 },
    { name: "G2", freq: 98.0 },
  ],
  Ukulele: [
    { name: "G4", freq: 392.0 },
    { name: "C4", freq: 261.63 },
    { name: "E4", freq: 329.63 },
    { name: "A4", freq: 440.0 },
  ],
};

const INSTRUMENTS = Object.keys(TUNINGS);
const REFERENCE_OPTIONS = [415, 432, 440, 442];
const IN_TUNE_CENTS = 5;
const CLOSE_CENTS = 15;
const MIN_FREQ = 30;
const MAX_FREQ = 1200;

function freqToNote(frequency, a4) {
  const midi = 69 + 12 * Math.log2(frequency / a4);
  const nearest = Math.round(midi);
  const exactFreq = a4 * Math.pow(2, (nearest - 69) / 12);
  const cents = 1200 * Math.log2(frequency / exactFreq);
  const noteName = NOTE_NAMES[((nearest % 12) + 12) % 12];
  const octave = Math.floor(nearest / 12) - 1;
  return { note: noteName, octave, cents, midi: nearest };
}

function nearestString(frequency, tuning) {
  let best = null;
  let bestDiffCents = Infinity;
  for (const s of tuning) {
    const diffCents = 1200 * Math.log2(frequency / s.freq);
    if (Math.abs(diffCents) < Math.abs(bestDiffCents)) {
      bestDiffCents = diffCents;
      best = s;
    }
  }
  return { string: best, cents: bestDiffCents };
}

// Autocorrelação (ACF2+) — detecta o período fundamental do sinal no
// domínio do tempo, robusto a harmônicos fortes (o problema do FFT puro).
function autoCorrelate(buffer, sampleRate) {
  const SIZE = buffer.length;

  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return -1; // silêncio / ruído de fundo

  // Corta silêncio nas bordas
  let r1 = 0;
  let r2 = SIZE - 1;
  const thres = 0.2;
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buffer[SIZE - i]) < thres) { r2 = SIZE - i; break; }
  }
  const trimmed = buffer.slice(r1, r2);
  const n = trimmed.length;
  if (n < 8) return -1;

  const maxLag = Math.min(n - 1, Math.floor(sampleRate / MIN_FREQ));
  const minLag = Math.max(1, Math.floor(sampleRate / MAX_FREQ));

  const c = new Float32Array(maxLag + 1);
  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < n - lag; i++) sum += trimmed[i] * trimmed[i + lag];
    c[lag] = sum;
  }

  let d = minLag;
  while (d < maxLag && c[d] > c[d + 1]) d++;

  let maxVal = -Infinity;
  let maxPos = -1;
  for (let i = d; i <= maxLag; i++) {
    if (c[i] > maxVal) {
      maxVal = c[i];
      maxPos = i;
    }
  }
  if (maxPos <= minLag || maxPos >= maxLag) return -1;

  // Interpolação parabólica para refinar o período estimado
  const x1 = c[maxPos - 1];
  const x2 = c[maxPos];
  const x3 = c[maxPos + 1];
  const a = (x1 + x3 - 2 * x2) / 2;
  const b = (x3 - x1) / 2;
  let T0 = maxPos;
  if (a !== 0) T0 = maxPos - b / (2 * a);

  return sampleRate / T0;
}

export default function RiffTheoryTuner() {
  const [running, setRunning] = useState(false);
  const [instrument, setInstrument] = useState("Guitarra");
  const [referenceA4, setReferenceA4] = useState(440);
  const [reading, setReading] = useState(null);
  const [error, setError] = useState(null);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const streamRef = useRef(null);
  const bufferRef = useRef(null);
  const intervalRef = useRef(null);
  const historyRef = useRef([]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    historyRef.current = [];
    setRunning(false);
    setReading(null);
  }, []);

  const tick = useCallback(() => {
    const analyser = analyserRef.current;
    const audioCtx = audioCtxRef.current;
    const buf = bufferRef.current;
    if (!analyser || !audioCtx || !buf) return;

    analyser.getFloatTimeDomainData(buf);
    const freq = autoCorrelate(buf, audioCtx.sampleRate);

    if (freq === -1 || freq < MIN_FREQ || freq > MAX_FREQ) {
      historyRef.current = [];
      setReading((prev) => (prev ? { ...prev, active: false } : prev));
      return;
    }

    // Média móvel curta para suavizar leituras sem misturar oitavas erradas
    const hist = historyRef.current;
    hist.push(freq);
    if (hist.length > 4) hist.shift();
    const smoothed = hist.reduce((a, b) => a + b, 0) / hist.length;

    const { note, octave, cents } = freqToNote(smoothed, referenceA4);
    const { string, cents: stringCents } = nearestString(smoothed, TUNINGS[instrument]);

    setReading({
      active: true,
      frequency: smoothed,
      note,
      octave,
      cents,
      stringName: string ? string.name : null,
      stringCents,
    });
  }, [instrument, referenceA4]);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);

      historyRef.current = [];
      setRunning(true);
      intervalRef.current = setInterval(tick, 80);
    } catch (err) {
      setError(
        "Não foi possível acessar o microfone. Verifique a permissão do navegador e tente novamente."
      );
      stop();
    }
  }, [tick, stop]);

  useEffect(() => stop, [stop]);

  // status: 'flat' | 'sharp' | 'tune' | 'close'
  const cents = reading && reading.active ? reading.cents : 0;
  const inTune = reading && reading.active && Math.abs(cents) <= IN_TUNE_CENTS;
  const close = reading && reading.active && Math.abs(cents) <= CLOSE_CENTS;

  let statusText = "AGUARDANDO SINAL";
  let statusColor = "var(--muted)";
  if (reading && reading.active) {
    if (inTune) {
      statusText = "AFINADO";
      statusColor = "var(--green)";
    } else if (cents < 0) {
      statusText = "MUITO BAIXO";
      statusColor = close ? "var(--amber)" : "var(--red)";
    } else {
      statusText = "MUITO ALTO";
      statusColor = close ? "var(--amber)" : "var(--red)";
    }
  }

  const clampedCents = Math.max(-50, Math.min(50, cents));
  const needleAngle = (clampedCents / 50) * 45; // -45deg .. +45deg

  return (
    <div className="rt-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');

        .rt-root {
          --bg: var(--carvao, #000203);
          --panel: #05070d;
          --panel-2: #0a0e18;
          --brass: var(--dourado, #4a8df9);
          --brass-dim: #2f5fb0;
          --green: var(--verde, #4caf76);
          --amber: #e0a23d;
          --red: var(--vermelho, #d94f3d);
          --cream: var(--branco, #f0f0f0);
          --muted: var(--cinza, #888888);
          --line: rgba(74,141,249,.18);

          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Inter', sans-serif;
          color: var(--cream);
          padding: 32px 16px;
          box-sizing: border-box;
        }

        .rt-panel {
          width: 100%;
          max-width: 460px;
          background: var(--pretty-gradient, linear-gradient(45deg, #190f1c, #000, #0f131a));
          border-radius: 26px;
          border: 1px solid rgba(74,141,249,.35);
          box-shadow:
            0 20px 50px rgba(0,0,0,.55),
            0 0 40px rgba(74,141,249,.18),
            inset 0 1px 0 rgba(255,255,255,.05);
          padding: 28px 26px 24px;
          box-sizing: border-box;
        }

        .rt-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        .rt-title {
          font-family: "Ethnocentric", sans-serif;
          font-weight: 700;
          letter-spacing: 0.06em;
          font-size: 15px;
          text-transform: uppercase;
          color: var(--cream);
        }

        .rt-title span {
          color: var(--brass);
        }

        .rt-ref-select {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--muted);
        }

        .rt-ref-select select {
          background: var(--bg);
          border: 1px solid var(--line);
          color: var(--cream);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          border-radius: 6px;
          padding: 4px 6px;
        }

        .rt-instruments {
          display: flex;
          gap: 6px;
          margin-bottom: 22px;
        }

        .rt-instrument-btn {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--line);
          color: var(--muted);
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 9px 4px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .rt-instrument-btn:hover {
          border-color: var(--brass-dim);
          color: var(--cream);
        }

        .rt-instrument-btn.active {
          background: linear-gradient(180deg, #1e243a, #16162c);
          border-color: var(--brass);
          color: var(--brass);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .rt-gauge-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 2 / 1.15;
          margin-bottom: 6px;
        }

        .rt-note-display {
          text-align: center;
          margin-top: -8px;
        }

        .rt-note {
          font-family: 'Oswald', sans-serif;
          font-weight: 700;
          font-size: clamp(48px, 16vw, 76px);
          line-height: 1;
          letter-spacing: -0.01em;
          transition: color 0.2s ease, text-shadow 0.2s ease;
          color: var(--cream);
          text-shadow: 0 0 22px currentColor;
        }

        .rt-octave {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 24px;
          vertical-align: super;
          color: var(--muted);
          margin-left: 2px;
        }

        .rt-freq {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 15px;
          color: var(--muted);
          margin-top: 4px;
        }

        .rt-status {
          text-align: center;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.12em;
          margin-top: 10px;
          transition: color 0.2s ease;
        }

        .rt-string-row {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 18px;
        }

        .rt-string-chip {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 7px;
          border: 1px solid var(--line);
          color: var(--muted);
          background: var(--bg);
          transition: all 0.15s ease;
        }

        .rt-string-chip.active {
          border-color: var(--green);
          color: var(--green);
          background: rgba(127, 216, 88, 0.08);
        }

        .rt-footswitch {
          width: 100%;
          margin-top: 22px;
          padding: 14px;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: linear-gradient(180deg, #1e2a3a, #151924);
          color: var(--brass);
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.06), 0 4px 10px rgba(0,0,0,0.3);
        }

        .rt-footswitch:hover {
          border-color: var(--brass);
        }

        .rt-footswitch.on {
          background: linear-gradient(180deg, #2f4a24, #223318);
          color: var(--green);
          border-color: var(--green);
        }

        .rt-error {
          margin-top: 14px;
          font-family: 'Inter', sans-serif;
          font-size: 12px;
          color: var(--red);
          text-align: center;
          line-height: 1.5;
        }

        .rt-hint {
          margin-top: 10px;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          color: var(--muted);
          text-align: center;
          line-height: 1.5;
        }

        @media (max-width: 480px) {
          .rt-root {
            padding: 16px 10px;
          }
          .rt-panel {
            padding: 22px 16px 18px;
            border-radius: 20px;
          }
          .rt-instrument-btn {
            font-size: 11px;
            padding: 8px 2px;
          }
        }
        .rt-panel.in-tune {
          animation: rtInTunePulse 1.1s ease-in-out infinite;
        }

        @keyframes rtInTunePulse {
          0%, 100% {
            box-shadow:
              0 20px 50px rgba(0,0,0,.55),
              0 0 40px rgba(74,141,249,.18),
              inset 0 1px 0 rgba(255,255,255,.05);
            border-color: rgba(74,141,249,.35);
          }
          50% {
            box-shadow:
              0 20px 50px rgba(0,0,0,.55),
              0 0 55px rgba(76,175,118,.45),
              inset 0 1px 0 rgba(255,255,255,.05);
            border-color: rgba(76,175,118,.6);
          }
        }

      `}</style>

      <div className={`rt-panel${inTune ? " in-tune" : ""}`}>
        <div className="rt-header">
          <div className="rt-title">
            RIFF THEORY <span>TUNER</span>
          </div>
          <div className="rt-ref-select">
            <span>A4</span>
            <select
              value={referenceA4}
              onChange={(e) => setReferenceA4(Number(e.target.value))}
            >
              {REFERENCE_OPTIONS.map((f) => (
                <option key={f} value={f}>{f} Hz</option>
              ))}
            </select>
          </div>
        </div>

        <div className="rt-instruments">
          {INSTRUMENTS.map((inst) => (
            <button
              key={inst}
              className={"rt-instrument-btn" + (instrument === inst ? " active" : "")}
              onClick={() => setInstrument(inst)}
            >
              {inst}
            </button>
          ))}
        </div>

        <div className="rt-gauge-wrap">
          <VUGauge angle={reading && reading.active ? needleAngle : 0} inTune={!!inTune} color={statusColor} />
        </div>

        <div className="rt-note-display">
          <span className="rt-note" style={{ color: reading && reading.active ? statusColor : "var(--cream)" }}>
            {reading && reading.active ? reading.note : "--"}
          </span>
          {reading && reading.active && (
            <span className="rt-octave">{reading.octave}</span>
          )}
          <div className="rt-freq">
            {reading && reading.active ? `${reading.frequency.toFixed(2)} Hz` : "-- Hz"}
            {reading && reading.active && (
              <span> &nbsp;·&nbsp; {cents >= 0 ? "+" : ""}{cents.toFixed(1)} cents</span>
            )}
          </div>
        </div>

        <div className="rt-status" style={{ color: statusColor }}>
          {running ? statusText : "PARADO"}
        </div>

        <div className="rt-string-row">
          {TUNINGS[instrument].map((s) => (
            <div
              key={s.name}
              className={
                "rt-string-chip" +
                (reading && reading.active && reading.stringName === s.name && Math.abs(reading.stringCents) <= IN_TUNE_CENTS
                  ? " active"
                  : "")
              }
            >
              {s.name}
            </div>
          ))}
        </div>

        <button
          className={"rt-footswitch" + (running ? " on" : "")}
          onClick={() => (running ? stop() : start())}
        >
          {running ? "Parar" : "Iniciar Afinador"}
        </button>

        {error && <div className="rt-error">{error}</div>}
        {!error && (
          <div className="rt-hint">
            Toque uma corda por vez, o mais próximo do microfone possível.
          </div>
        )}
      </div>
    </div>
  );
}

function VUGauge({ angle, inTune, color }) {
  // Arco semicircular com marcações de -50 a +50 cents e ponteiro estilo VU meter.
  const cx = 200;
  const cy = 165;
  const r = 130;

  const ticks = [-50, -25, 0, 25, 50];

  const toXY = (deg, radius) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  return (
    <svg viewBox="0 0 400 195" width="100%" height="100%">
      <defs>
        <linearGradient id="rt-arc-grad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#e2543f" />
          <stop offset="40%" stopColor="#3db8e8" />
          <stop offset="50%" stopColor="#7fd858" />
          <stop offset="60%" stopColor="#3da4e8" />
          <stop offset="100%" stopColor="#e2543f" />
        </linearGradient>
      </defs>

      {/* Arco de fundo */}
      <path
        d={`M ${toXY(-45, r).x} ${toXY(-45, r).y} A ${r} ${r} 0 0 1 ${toXY(45, r).x} ${toXY(45, r).y}`}
        stroke="#29313a"
        strokeWidth="10"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M ${toXY(-45, r).x} ${toXY(-45, r).y} A ${r} ${r} 0 0 1 ${toXY(45, r).x} ${toXY(45, r).y}`}
        stroke="url(#rt-arc-grad)"
        strokeWidth="4"
        fill="none"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Marcações */}
      {ticks.map((t) => {
        const deg = (t / 50) * 45;
        const outer = toXY(deg, r + 10);
        const inner = toXY(deg, r - 6);
        return (
          <g key={t}>
            <line
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={t === 0 ? "#7fd858" : "#6c7a8a"}
              strokeWidth={t === 0 ? 3 : 1.5}
            />
            <text
              x={toXY(deg, r + 24).x}
              y={toXY(deg, r + 24).y}
              fill="#6c798a"
              fontSize="10"
              fontFamily="'IBM Plex Mono', monospace"
              textAnchor="middle"
            >
              {t > 0 ? `+${t}` : t}
            </text>
          </g>
        );
      })}

      {/* Ponteiro */}
      <g style={{ transition: "transform 0.15s ease-out" }} transform={`rotate(${angle} ${cx} ${cy})`}>
        <line
          x1={cx} y1={cy} x2={cx} y2={cy - r + 14}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <circle cx={cx} cy={cy} r="7" fill={color} stroke="#141017" strokeWidth="2" />
      {inTune && <circle cx={cx} cy={cy} r="14" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" />}
    </svg>
  );
}