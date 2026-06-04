const REQUEST_TIMEOUT_MS = 12000;

const LOTOFACIL_ENDPOINTS = [
  'https://loteriascaixa-api.herokuapp.com/api/lotofacil/latest',
  'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil',
];

export type ResultadoOficialLotofacil = {
  concurso: string;
  data: string;
  dezenas: string[];
  premioEstimado: string;
};

function toNumberStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function parsePremio(value: unknown): string {
  if (typeof value === 'number') {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    });
  }

  const asString = String(value ?? '').trim();
  return asString || 'N/D';
}

function normalizarResultado(raw: any): ResultadoOficialLotofacil | null {
  const dezenas = toNumberStringList(raw?.dezenas ?? raw?.listaDezenas);
  if (dezenas.length === 0) {
    return null;
  }

  const concurso = String(raw?.concurso ?? raw?.numero ?? '').trim();
  const data = String(raw?.data ?? raw?.dataApuracao ?? '').trim();
  const premioEstimado = parsePremio(raw?.acumuladaProxConcurso ?? raw?.valorEstimadoProximoConcurso);

  return {
    concurso: concurso || 'N/D',
    data: data || 'N/D',
    dezenas,
    premioEstimado,
  };
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function buscarResultadoOficialLotofacil(): Promise<ResultadoOficialLotofacil> {
  let lastError: Error | null = null;

  for (const url of LOTOFACIL_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      const resultado = normalizarResultado(json);
      if (!resultado) {
        throw new Error('Formato de resposta inválido.');
      }

      return resultado;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Falha desconhecida');
    }
  }

  throw new Error(`Não foi possível obter resultados oficiais. ${lastError?.message || ''}`.trim());
}
