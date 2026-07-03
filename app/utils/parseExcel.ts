import * as XLSX from "xlsx";
import { Strategy, ParsedPortfolio } from "../types";

export function parseExcelFile(file: File): Promise<ParsedPortfolio> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
          raw: false,
          defval: "",
        });

        const strategies: Strategy[] = rows
          .filter((row) => {
            const name = String(row["Nome"] || row["name"] || row["NOME"] || "").trim();
            return name.length > 0;
          })
          .map((row) => {
            const name = String(
              row["Nome"] || row["name"] || row["NOME"] || ""
            ).trim();
            const weight = parseFloat(
              String(row["Peso"] || row["peso"] || row["PESO"] || row["Weight"] || row["weight"] || "0")
                .replace(",", ".")
                .replace("%", "")
            );
            const ret = parseFloat(
              String(
                row["Rendimento"] || row["rendimento"] || row["RENDIMENTO"] ||
                row["Return"] || row["return"] || row["Ritorno"] || "0"
              )
                .replace(",", ".")
                .replace("%", "")
            );
            const isCore =
              String(row["Core"] || row["core"] || row["CORE"] || "")
                .trim()
                .toLowerCase() === "si" ||
              String(row["Core"] || row["core"] || row["CORE"] || "")
                .trim()
                .toLowerCase() === "sì" ||
              String(row["Core"] || row["core"] || row["CORE"] || "")
                .trim()
                .toLowerCase() === "yes" ||
              String(row["Core"] || row["core"] || row["CORE"] || "")
                .trim()
                .toLowerCase() === "true";

            return { name, weight, return: ret, isCore };
          });

        const core = strategies.find((s) => s.isCore) || strategies[0] || null;
        if (core) core.isCore = true;

        const satellites = strategies.filter((s) => s !== core);

        resolve({ core, satellites });
      } catch (err) {
        reject(new Error("Errore nel parsing del file Excel: " + err));
      }
    };
    reader.onerror = () => reject(new Error("Errore nella lettura del file"));
    reader.readAsArrayBuffer(file);
  });
}
