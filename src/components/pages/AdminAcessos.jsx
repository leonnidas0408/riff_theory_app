import { useEffect, useMemo, useState } from "react";
import { supabase, supabaseConfigured } from "../../utils/supabase";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

export default function AdminAcessos() {
    const [session, setSession] = useState(null);
    const [summary, setSummary] = useState([]);
    const [devices, setDevices] = useState([]);
    const [selectedDate, setSelectedDate] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!supabase) { setLoading(false); return undefined; }
        supabase.auth.getSession().then(({ data }) => setSession(data.session));
        const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
        return () => listener.subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!session || !supabase) return;
        let cancelled = false;
        setLoading(true);
        Promise.all([
            supabase.from("access_daily_summary").select("day,total_accesses,unique_browsers,total_sessions,avg_accesses_per_browser").order("day", { ascending: false }).limit(30),
            supabase.from("access_daily_device_summary").select("day,browser_id,access_count").order("day", { ascending: false }).order("access_count", { ascending: false }).limit(300),
        ]).then(([summaryResult, deviceResult]) => {
            if (cancelled) return;
            const failure = summaryResult.error || deviceResult.error;
            if (failure) setError(failure.message);
            else { setSummary(summaryResult.data || []); setDevices(deviceResult.data || []); }
            setLoading(false);
        });
        return () => { cancelled = true; };
    }, [session]);

    const selectedDevices = useMemo(() => selectedDate ? devices.filter((row) => row.day === selectedDate) : [], [devices, selectedDate]);
    const latest = summary[0];

    if (!supabaseConfigured()) return <main className="admin-page"><h1>Painel de acessos</h1><p>Supabase ainda não está configurado neste ambiente.</p></main>;
    if (!session) return <main className="admin-page"><h1>Painel de acessos</h1><p>Área restrita a administradores cadastrados.</p><button className="admin-button" onClick={() => supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/admin/acessos` } })}>Entrar com Google</button></main>;

    return <main className="admin-page">
        <header className="admin-header"><div><span className="admin-eyebrow">RIFF THEORY / ADMIN</span><h1>Métricas de acesso</h1><p>Dados agregados por navegador pseudônimo. Nenhum IP, caminho ou user-agent é armazenado.</p></div><button className="admin-button secondary" onClick={() => supabase.auth.signOut()}>Sair</button></header>
        {error && <div className="admin-error">Não foi possível carregar as métricas: {error}</div>}
        {loading ? <p>Carregando métricas…</p> : <>
            <section className="admin-cards">
                <article><span>Acessos mais recentes</span><strong>{money(latest?.total_accesses)}</strong></article>
                <article><span>Navegadores únicos</span><strong>{money(latest?.unique_browsers)}</strong></article>
                <article><span>Sessões</span><strong>{money(latest?.total_sessions)}</strong></article>
                <article><span>Média por navegador</span><strong>{money(latest?.avg_accesses_per_browser)}</strong></article>
            </section>
            <section className="admin-panel"><div className="admin-panel-title"><h2>Últimos 30 dias</h2><span>America/São Paulo</span></div><div className="admin-table-wrap"><table><thead><tr><th>Dia</th><th>Acessos</th><th>Navegadores</th><th>Sessões</th><th>Média / navegador</th></tr></thead><tbody>{summary.map((row) => <tr key={row.day}><td>{new Date(`${row.day}T12:00:00`).toLocaleDateString("pt-BR")}</td><td>{money(row.total_accesses)}</td><td>{money(row.unique_browsers)}</td><td>{money(row.total_sessions)}</td><td>{money(row.avg_accesses_per_browser)}</td></tr>)}</tbody></table></div></section>
            <section className="admin-panel"><div className="admin-panel-title"><h2>Detalhamento por navegador</h2><select value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)}><option value="">Escolha uma data</option>{summary.map((row) => <option key={row.day} value={row.day}>{new Date(`${row.day}T12:00:00`).toLocaleDateString("pt-BR")}</option>)}</select></div>{selectedDate && <div className="admin-table-wrap"><table><thead><tr><th>Identificador pseudônimo</th><th>Acessos</th></tr></thead><tbody>{selectedDevices.map((row) => <tr key={`${row.day}-${row.browser_id}`}><td className="mono">{row.browser_id}</td><td>{money(row.access_count)}</td></tr>)}</tbody></table></div>}</section>
        </>}
    </main>;
}
