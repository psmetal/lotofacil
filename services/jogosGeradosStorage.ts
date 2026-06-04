import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'lotofacil_jogos_gerados_cache';
const MAX_JOGOS = 100;

function normalizarJogos(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((jogo) => {
      if (!Array.isArray(jogo)) {
        return [];
      }

      const numeros = jogo
        .map((numero) => Number(numero))
        .filter((numero) => Number.isInteger(numero) && numero >= 1 && numero <= 25);

      if (numeros.length === 0) {
        return [];
      }

      return [...new Set(numeros)].sort((a, b) => a - b);
    })
    .filter((jogo) => jogo.length > 0);
}

function deduplicarJogos(jogos: number[][]): number[][] {
  const vistos = new Set<string>();
  const resultado: number[][] = [];

  for (const jogo of jogos) {
    const chave = jogo.join('-');
    if (vistos.has(chave)) {
      continue;
    }

    vistos.add(chave);
    resultado.push(jogo);
  }

  return resultado.slice(0, MAX_JOGOS);
}

export async function lerJogosGeradosLocais(): Promise<number[][]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    return deduplicarJogos(normalizarJogos(JSON.parse(raw)));
  } catch {
    return [];
  }
}

export async function salvarJogosGeradosLocais(jogos: number[][]): Promise<number[][]> {
  const normalizados = deduplicarJogos(normalizarJogos(jogos));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalizados));
  return normalizados;
}

export async function limparJogosGeradosLocais(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
