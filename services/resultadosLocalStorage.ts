import AsyncStorage from '@react-native-async-storage/async-storage';

type ResultadoDetalhado = {
  data: string;
  dezenas: string[];
};

type CacheResultados = {
  historico_resultados_lotofacil_detalhado: ResultadoDetalhado[];
  historico_resultados_lotofacil: string[][];
  ultimos_resultados_lotofacil: string[];
  ultima_data_resultado_lotofacil: string;
};

const STORAGE_KEY = 'lotofacil_resultados_cache';
const MAX_HISTORICO = 10;

function normalizarHistoricoDetalhado(value: unknown): ResultadoDetalhado[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const dezenas = Array.isArray((item as any)?.dezenas)
        ? (item as any).dezenas.map((n: unknown) => String(n)).filter(Boolean)
        : [];

      if (dezenas.length === 0) {
        return null;
      }

      return {
        data: String((item as any)?.data || ''),
        dezenas,
      };
    })
    .filter(Boolean) as ResultadoDetalhado[];
}

function normalizarCache(raw: Partial<CacheResultados> | null | undefined): CacheResultados {
  const historicoDetalhado = Array.isArray(raw?.historico_resultados_lotofacil_detalhado)
    ? raw!.historico_resultados_lotofacil_detalhado
      .map((item) => {
        const dezenas = Array.isArray(item?.dezenas) ? item.dezenas.map((n) => String(n)) : [];
        if (dezenas.length === 0) {
          return null;
        }
        return {
          data: String(item?.data || ''),
          dezenas,
        };
      })
      .filter(Boolean) as ResultadoDetalhado[]
    : [];

  const historicoSimples = historicoDetalhado.map((item) => item.dezenas);
  const ultimos = historicoDetalhado[0]?.dezenas || [];
  const ultimaData = historicoDetalhado[0]?.data || '';

  return {
    historico_resultados_lotofacil_detalhado: historicoDetalhado.slice(0, MAX_HISTORICO),
    historico_resultados_lotofacil: historicoSimples.slice(0, MAX_HISTORICO),
    ultimos_resultados_lotofacil: ultimos,
    ultima_data_resultado_lotofacil: ultimaData,
  };
}

export async function lerCacheResultadosLotofacil(): Promise<CacheResultados> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return normalizarCache(null);
  }

  try {
    const parsed = JSON.parse(raw);
    return normalizarCache(parsed);
  } catch {
    return normalizarCache(null);
  }
}

export async function salvarResultadoLotofacilLocal(dataConcurso: string, dezenasAtuais: string[]): Promise<CacheResultados> {
  const cacheAtual = await lerCacheResultadosLotofacil();
  const chaveAtual = dezenasAtuais.join('-');

  const historicoSemDuplicado = cacheAtual.historico_resultados_lotofacil_detalhado.filter((item) => {
    if (dataConcurso && item.data) {
      return item.data !== dataConcurso;
    }

    return item.dezenas.join('-') !== chaveAtual;
  });

  const novoHistoricoDetalhado = [
    { data: dataConcurso, dezenas: dezenasAtuais },
    ...historicoSemDuplicado,
  ].slice(0, MAX_HISTORICO);

  const novoCache = normalizarCache({
    historico_resultados_lotofacil_detalhado: novoHistoricoDetalhado,
  });

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novoCache));
  return novoCache;
}

export async function salvarHistoricoDetalhadoLotofacilLocal(historicoDetalhado: unknown): Promise<CacheResultados> {
  const normalizado = normalizarHistoricoDetalhado(historicoDetalhado).slice(0, MAX_HISTORICO);
  const novoCache = normalizarCache({
    historico_resultados_lotofacil_detalhado: normalizado,
  });

  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novoCache));
  return novoCache;
}
