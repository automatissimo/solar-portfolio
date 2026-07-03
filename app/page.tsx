"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import FileUpload from "./components/FileUpload";
import Portfolio from "./components/Portfolio";
import { parseExcelFile } from "./utils/parseExcel";
import { ParsedPortfolio } from "./types";

const SolarSystem = dynamic(() => import("./components/SolarSystem"), {
  ssr: false,
});

const DEMO_DATA: ParsedPortfolio = {
  core: { name: "Portafoglio Core", weight: 40, return: 5.2, isCore: true },
  satellites: [
    { name: "Tech Growth", weight: 15, return: 12.4 },
    { name: "Bond Flex", weight: 10, return: -1.8 },
    { name: "Commodities", weight: 8, return: 7.3 },
    { name: "EM Markets", weight: 12, return: -4.1 },
    { name: "Small Cap", weight: 9, return: 18.6 },
    { name: "Real Estate", weight: 6, return: 3.9 },
  ],
};

export default function Home() {
  const [portfolio, setPortfolio] = useState<ParsedPortfolio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const result = await parseExcelFile(file);
      if (!result.core) {
        setError("Nessuna strategia trovata nel file. Controlla il formato.");
        setLoading(false);
        return;
      }
      setPortfolio(result);
      setShowDemo(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const activePortfolio = showDemo ? DEMO_DATA : portfolio;

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌌</span>
          <div>
            <h1 className="font-bold text-lg text-white">Solar Portfolio</h1>
            <p className="text-xs text-gray-400">Visualizzazione sistema solare del tuo portafoglio</p>
          </div>
        </div>
        {activePortfolio && (
          <button
            onClick={() => { setPortfolio(null); setShowDemo(false); }}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Nuovo file
          </button>
        )}
      </header>

      {!activePortfolio ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
          <div className="w-full max-w-lg">
            <div className="text-center mb-10">
              <div className="text-6xl mb-4">☀️</div>
              <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                Il tuo portafoglio come sistema solare
              </h2>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Carica il tuo file Excel e osserva le strategie orbitare attorno al nucleo.
                Le orbite orarie indicano guadagni, le antiorarie perdite.
              </p>
            </div>

            <FileUpload onFile={handleFile} loading={loading} />

            {error && (
              <div className="mt-4 p-3 bg-red-900/40 border border-red-700 rounded-xl text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="mt-6 bg-gray-800/50 rounded-xl p-4 border border-gray-700">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Formato Excel atteso</p>
              <div className="overflow-x-auto">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left pb-2 pr-4">Nome</th>
                      <th className="text-left pb-2 pr-4">Peso</th>
                      <th className="text-left pb-2 pr-4">Rendimento</th>
                      <th className="text-left pb-2">Core</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    <tr className="border-b border-gray-800">
                      <td className="py-1.5 pr-4">Portafoglio Core</td>
                      <td className="py-1.5 pr-4">40</td>
                      <td className="py-1.5 pr-4">5.2</td>
                      <td className="py-1.5 text-yellow-400">Sì</td>
                    </tr>
                    <tr className="border-b border-gray-800">
                      <td className="py-1.5 pr-4">Tech Growth</td>
                      <td className="py-1.5 pr-4">15</td>
                      <td className="py-1.5 pr-4">12.4</td>
                      <td className="py-1.5 text-gray-500">—</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 pr-4">Bond Flex</td>
                      <td className="py-1.5 pr-4">10</td>
                      <td className="py-1.5 pr-4">-1.8</td>
                      <td className="py-1.5 text-gray-500">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                La colonna <span className="text-yellow-400">Core</span> è opzionale — se omessa, la prima riga diventa il nucleo.
                I valori possono usare virgola o punto decimale.
              </p>
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => setShowDemo(true)}
                className="text-sm text-yellow-400 hover:text-yellow-300 underline underline-offset-2 transition-colors"
              >
                Prova con dati demo
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden" style={{ minHeight: "calc(100vh - 65px)" }}>
          <div className="flex-1 relative">
            <SolarSystem
              core={activePortfolio.core!}
              satellites={activePortfolio.satellites}
            />
          </div>
          <aside className="w-72 flex-shrink-0 border-l border-gray-800 p-4 overflow-y-auto">
            <Portfolio
              core={activePortfolio.core!}
              satellites={activePortfolio.satellites}
              onReset={() => { setPortfolio(null); setShowDemo(false); }}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
