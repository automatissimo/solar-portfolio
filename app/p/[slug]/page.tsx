"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Portfolio from "../../components/Portfolio";
import { supabase, Portfolio as PortfolioRow, StrategyRow } from "../../../lib/supabase";
import { Strategy } from "../../types";

const SolarSystem = dynamic(() => import("../../components/SolarSystem"), { ssr: false });
const AtomSystem = dynamic(() => import("../../components/AtomSystem"), { ssr: false });

interface LoadedData {
  portfolio: PortfolioRow;
  core: Strategy;
  satellites: Strategy[];
}

export default function ClientPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [data, setData] = useState<LoadedData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    async function load() {
      const { data: portfolioData, error: pErr } = await supabase
        .from("portfolios")
        .select("*")
        .eq("slug", slug)
        .single();

      if (pErr || !portfolioData) {
        setError("Portafoglio non trovato.");
        setLoading(false);
        return;
      }

      const { data: strategies, error: sErr } = await supabase
        .from("strategies")
        .select("*")
        .eq("portfolio_id", portfolioData.id)
        .order("position");

      if (sErr || !strategies) {
        setError("Errore nel caricamento delle strategie.");
        setLoading(false);
        return;
      }

      const coreRow = strategies.find((s: StrategyRow) => s.is_core);
      const satelliteRows = strategies.filter((s: StrategyRow) => !s.is_core);

      if (!coreRow) {
        setError("Strategia core non trovata.");
        setLoading(false);
        return;
      }

      setData({
        portfolio: portfolioData,
        core: { name: coreRow.name, weight: coreRow.weight, return: coreRow.return_pct, isCore: true },
        satellites: satelliteRows.map((s: StrategyRow) => ({
          name: s.name,
          weight: s.weight,
          return: s.return_pct,
        })),
      });
      setLoading(false);
    }

    load();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-gray-400 text-sm animate-pulse">Caricamento portafoglio...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🌌</div>
          <p className="text-red-400 text-sm">{error || "Errore sconosciuto."}</p>
        </div>
      </div>
    );
  }

  const { portfolio, core, satellites } = data;
  const isAtom = portfolio.view_mode === "atom";

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white flex flex-col">
      <header className="flex items-center gap-3 px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <span className="text-2xl">{isAtom ? "⚛️" : "🌌"}</span>
        <div>
          <h1 className="font-bold text-lg text-white">{portfolio.client_name}</h1>
          <p className="text-xs text-gray-400">
            Portafoglio {isAtom ? "atomico" : "solare"} · Sola lettura
          </p>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden" style={{ minHeight: "calc(100vh - 65px)" }}>
        <div className="flex-1 relative">
          {isAtom ? (
            <AtomSystem core={core} satellites={satellites} />
          ) : (
            <SolarSystem core={core} satellites={satellites} />
          )}
        </div>
        <aside className="w-72 flex-shrink-0 border-l border-gray-800 p-4 overflow-y-auto">
          <Portfolio core={core} satellites={satellites} hideReset />
        </aside>
      </div>
    </div>
  );
}
