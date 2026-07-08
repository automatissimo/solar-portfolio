"use client";

import { useState, useEffect, useRef } from "react";
import { supabase, Portfolio, StrategyRow } from "../../lib/supabase";
import { parseExcelFile } from "../utils/parseExcel";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-1 rounded bg-cyan-400/10 hover:bg-cyan-400/20"
    >
      {copied ? "✓ Copiato" : "Copia link"}
    </button>
  );
}

export default function AdminPage() {
  const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || "admin";
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newMode, setNewMode] = useState<"solar" | "atom">("solar");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const updateFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (authed) fetchPortfolios();
  }, [authed]);

  async function fetchPortfolios() {
    setLoadingList(true);
    const { data } = await supabase.from("portfolios").select("*").order("created_at", { ascending: false });
    setPortfolios(data || []);
    setLoadingList(false);
  }

  async function upsertStrategies(portfolioId: string, file: File) {
    const parsed = await parseExcelFile(file);
    if (!parsed.core) throw new Error("Nessuna strategia core nel file.");

    await supabase.from("strategies").delete().eq("portfolio_id", portfolioId);

    const rows: Omit<StrategyRow, "id">[] = [
      {
        portfolio_id: portfolioId,
        name: parsed.core.name,
        weight: parsed.core.weight,
        return_pct: parsed.core.return,
        is_core: true,
        position: 0,
      },
      ...parsed.satellites.map((s, i) => ({
        portfolio_id: portfolioId,
        name: s.name,
        weight: s.weight,
        return_pct: s.return,
        is_core: false,
        position: i + 1,
      })),
    ];

    const { error } = await supabase.from("strategies").insert(rows);
    if (error) throw new Error(error.message);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newFile) { setCreateError("Seleziona un file Excel."); return; }
    setCreating(true);
    setCreateError(null);

    const slug = newSlug || slugify(newName);

    const { data: existing } = await supabase.from("portfolios").select("id").eq("slug", slug).single();
    if (existing) { setCreateError("Slug già esistente: scegli un altro nome."); setCreating(false); return; }

    const { data: portfolio, error } = await supabase
      .from("portfolios")
      .insert({ slug, client_name: newName, view_mode: newMode })
      .select()
      .single();

    if (error || !portfolio) { setCreateError(error?.message || "Errore creazione."); setCreating(false); return; }

    try {
      await upsertStrategies(portfolio.id, newFile);
    } catch (err) {
      await supabase.from("portfolios").delete().eq("id", portfolio.id);
      setCreateError(String(err));
      setCreating(false);
      return;
    }

    setNewName(""); setNewSlug(""); setNewMode("solar"); setNewFile(null);
    await fetchPortfolios();
    setCreating(false);
  }

  async function handleUpdateFile(portfolio: Portfolio, file: File) {
    setUpdatingId(portfolio.id);
    try {
      await upsertStrategies(portfolio.id, file);
      await supabase.from("portfolios").update({ updated_at: new Date().toISOString() }).eq("id", portfolio.id);
    } catch (err) {
      alert(String(err));
    }
    setUpdatingId(null);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Eliminare il portafoglio di ${name}?`)) return;
    setDeletingId(id);
    await supabase.from("strategies").delete().eq("portfolio_id", id);
    await supabase.from("portfolios").delete().eq("id", id);
    await fetchPortfolios();
    setDeletingId(null);
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (pw === adminKey) { setAuthed(true); } else { setPwError(true); }
          }}
          className="bg-gray-800/80 border border-gray-700 rounded-2xl p-8 w-full max-w-sm"
        >
          <h1 className="text-lg font-bold text-white mb-1">Accesso Admin</h1>
          <p className="text-xs text-gray-400 mb-6">Inserisci la password per gestire i portafogli clienti.</p>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setPwError(false); }}
            placeholder="Password"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 mb-3"
          />
          {pwError && <p className="text-red-400 text-xs mb-3">Password errata.</p>}
          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Accedi
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌌</span>
          <div>
            <h1 className="font-bold text-lg">Admin Panel</h1>
            <p className="text-xs text-gray-400">Gestione portafogli clienti</p>
          </div>
        </div>
        <button
          onClick={() => setAuthed(false)}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          Esci
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* CREATE FORM */}
        <section className="bg-gray-800/60 border border-gray-700 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-gray-200 mb-4 uppercase tracking-wider">
            Nuovo portafoglio cliente
          </h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome cliente *</label>
                <input
                  required
                  value={newName}
                  onChange={(e) => { setNewName(e.target.value); if (!newSlug) setNewSlug(""); }}
                  placeholder="Mario Rossi"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">
                  Slug URL <span className="text-gray-600">(auto se vuoto)</span>
                </label>
                <input
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder={newName ? slugify(newName) : "mario-rossi"}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Visualizzazione</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewMode("solar")}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      newMode === "solar"
                        ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-300"
                        : "bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    ☀️ Solare
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMode("atom")}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      newMode === "atom"
                        ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                        : "bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    ⚛️ Atom
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">File Excel *</label>
                <label className="flex items-center gap-2 w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm cursor-pointer hover:border-gray-500 transition-colors">
                  <span className="text-gray-500 truncate flex-1">
                    {newFile ? newFile.name : "Scegli file..."}
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  />
                  <span className="text-xs text-gray-400 flex-shrink-0">Sfoglia</span>
                </label>
              </div>
            </div>

            {createError && (
              <p className="text-red-400 text-xs bg-red-900/20 border border-red-800 rounded-xl px-3 py-2">
                {createError}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              {creating ? "Creazione in corso..." : "Crea portafoglio"}
            </button>
          </form>
        </section>

        {/* LIST */}
        <section>
          <h2 className="text-sm font-semibold text-gray-200 mb-4 uppercase tracking-wider">
            Portafogli clienti ({portfolios.length})
          </h2>

          {loadingList ? (
            <p className="text-gray-500 text-sm animate-pulse">Caricamento...</p>
          ) : portfolios.length === 0 ? (
            <p className="text-gray-500 text-sm">Nessun portafoglio ancora.</p>
          ) : (
            <div className="space-y-3">
              {portfolios.map((p) => {
                const url = `${baseUrl}/p/${p.slug}`;
                return (
                  <div
                    key={p.id}
                    className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 flex items-center gap-4"
                  >
                    <span className="text-xl flex-shrink-0">{p.view_mode === "atom" ? "⚛️" : "☀️"}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm">{p.client_name}</div>
                      <div className="text-xs text-gray-500 truncate">{url}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <CopyButton text={url} />

                      {/* Update Excel */}
                      <label className={`text-xs transition-colors px-2 py-1 rounded cursor-pointer ${
                        updatingId === p.id
                          ? "text-gray-500 bg-gray-700 pointer-events-none"
                          : "text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600"
                      }`}>
                        {updatingId === p.id ? "Aggiornamento..." : "Aggiorna file"}
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                          ref={(el) => { updateFileRefs.current[p.id] = el; }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleUpdateFile(p, file);
                            e.target.value = "";
                          }}
                        />
                      </label>

                      <button
                        onClick={() => handleDelete(p.id, p.client_name)}
                        disabled={deletingId === p.id}
                        className="text-xs text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        {deletingId === p.id ? "..." : "Elimina"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
