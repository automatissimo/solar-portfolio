export interface Strategy {
  name: string;
  weight: number;    // % del portafoglio totale
  return: number;    // % rendimento (positivo = guadagno, negativo = perdita)
  isCore?: boolean;  // true = sole/core
}

export interface ParsedPortfolio {
  core: Strategy | null;
  satellites: Strategy[];
}
