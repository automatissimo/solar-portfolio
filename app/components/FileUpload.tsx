"use client";

import { useRef, useState } from "react";

interface Props {
  onFile: (file: File) => void;
  loading: boolean;
}

export default function FileUpload({ onFile, loading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  }

  return (
    <div
      className={`
        border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer
        ${dragging ? "border-yellow-400 bg-yellow-400/10" : "border-gray-600 hover:border-yellow-500 hover:bg-yellow-500/5"}
      `}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleChange}
      />
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400">Caricamento in corso...</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="text-5xl">📊</div>
          <p className="text-white font-semibold text-lg">
            Trascina il tuo file Excel qui
          </p>
          <p className="text-gray-400 text-sm">oppure clicca per selezionarlo</p>
          <p className="text-gray-600 text-xs mt-2">Formati supportati: .xlsx, .xls</p>
        </div>
      )}
    </div>
  );
}
