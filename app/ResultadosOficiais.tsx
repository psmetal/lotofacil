import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { apiGetAuth, apiPatch } from '../services/api';
import {
  lerCacheResultadosLotofacil,
  salvarResultadoLotofacilLocal,
  salvarHistoricoDetalhadoLotofacilLocal,
} from '../services/resultadosLocalStorage';
import { buscarResultadoOficialLotofacil, ResultadoOficialLotofacil } from '../services/resultadosOficiaisService';

const DARK_BG = '#050505';
const DARK_CARD = '#121212';
const DARK_BORDER = '#2a2a2a';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#cfcfcf';

function parseDezenasInput(value: string): string[] {
  const partes = value
    .split(/[^0-9]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const normalizadas = partes
    .map((item) => Number(item))
    .filter((numero) => Number.isInteger(numero) && numero >= 1 && numero <= 25)
    .map((numero) => String(numero).padStart(2, '0'));

  return [...new Set(normalizadas)].sort((a, b) => Number(a) - Number(b));
}

export default function ResultadosOficiais() {
  const [resultado, setResultado] = useState<ResultadoOficialLotofacil | null>(null);
  const [historicoSalvo, setHistoricoSalvo] = useState<Array<{ data: string; dezenas: string[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [manualData, setManualData] = useState('');
  const [manualDezenas, setManualDezenas] = useState('');
  const [savingManual, setSavingManual] = useState(false);
  const [removingItemIndex, setRemovingItemIndex] = useState<number | null>(null);
  const router = useRouter();

  function normalizarHistoricoDetalhado(value: any): Array<{ data: string; dezenas: string[] }> {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((item: any) => {
        const dezenas = Array.isArray(item?.dezenas)
          ? item.dezenas.map((numero: string) => String(numero))
          : Array.isArray(item)
            ? item.map((numero: string) => String(numero))
            : null;

        if (!dezenas || dezenas.length === 0) {
          return null;
        }

        return {
          data: String(item?.data || ''),
          dezenas,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  }

  async function carregarHistoricoSalvo(token: string) {
    try {
      const user = await apiGetAuth('/me', token);
      const historico = normalizarHistoricoDetalhado(user?.historico_resultados_lotofacil_detalhado);
      if (historico.length > 0) {
        setHistoricoSalvo(historico);
        return;
      }

      const cacheLocal = await lerCacheResultadosLotofacil();
      setHistoricoSalvo(cacheLocal.historico_resultados_lotofacil_detalhado.slice(0, 10));
    } catch {
      const cacheLocal = await lerCacheResultadosLotofacil();
      setHistoricoSalvo(cacheLocal.historico_resultados_lotofacil_detalhado.slice(0, 10));
    }
  }

  async function salvarResultadoNoHistorico(token: string, dezenasAtuais: string[], dataConcurso: string) {
    try {
      const user = await apiGetAuth('/me', token);

      const historicoDetalhadoAtual = Array.isArray(user?.historico_resultados_lotofacil_detalhado)
        ? user.historico_resultados_lotofacil_detalhado
        : [];

      const historicoDetalhadoNormalizado = historicoDetalhadoAtual
        .map((item: any) => {
          const dezenas = Array.isArray(item?.dezenas)
            ? item.dezenas.map((numero: string) => String(numero))
            : Array.isArray(item)
              ? item.map((numero: string) => String(numero))
              : null;

          if (!dezenas || dezenas.length === 0) {
            return null;
          }

          return {
            data: String(item?.data || ''),
            dezenas,
          };
        })
        .filter(Boolean) as Array<{ data: string; dezenas: string[] }>;

      const chaveAtual = dezenasAtuais.join('-');
      const historicoSemDuplicado = historicoDetalhadoNormalizado.filter((item) => {
        if (dataConcurso && item.data) {
          return item.data !== dataConcurso;
        }

        return item.dezenas.join('-') !== chaveAtual;
      });

      const novoHistoricoDetalhado = [
        { data: dataConcurso, dezenas: dezenasAtuais },
        ...historicoSemDuplicado,
      ].slice(0, 10);

      const novoHistorico = novoHistoricoDetalhado.map((item) => item.dezenas);

      await apiPatch(
        '/me/lotofacil',
        {
          historico_resultados_lotofacil: novoHistorico,
          historico_resultados_lotofacil_detalhado: novoHistoricoDetalhado,
          ultimos_resultados_lotofacil: dezenasAtuais,
          ultima_data_resultado_lotofacil: dataConcurso,
        },
        token
      );
      setHistoricoSalvo(novoHistoricoDetalhado);
    } catch (saveError) {
      console.warn('Erro ao salvar resultados no backend:', saveError);
      const cache = await salvarResultadoLotofacilLocal(dataConcurso, dezenasAtuais);
      setHistoricoSalvo(cache.historico_resultados_lotofacil_detalhado);
    }
  }

  async function persistirHistoricoCompleto(token: string, historicoDetalhado: Array<{ data: string; dezenas: string[] }>) {
    const limitado = historicoDetalhado.slice(0, 10);
    const historicoSimples = limitado.map((item) => item.dezenas);
    const maisRecente = limitado[0] || { data: '', dezenas: [] };

    try {
      await apiPatch(
        '/me/lotofacil',
        {
          historico_resultados_lotofacil: historicoSimples,
          historico_resultados_lotofacil_detalhado: limitado,
          ultimos_resultados_lotofacil: maisRecente.dezenas,
          ultima_data_resultado_lotofacil: maisRecente.data,
        },
        token
      );
      setHistoricoSalvo(limitado);
    } catch (error) {
      console.warn('Erro ao persistir histórico completo no backend:', error);
      const cache = await salvarHistoricoDetalhadoLotofacilLocal(limitado);
      setHistoricoSalvo(cache.historico_resultados_lotofacil_detalhado);
    }
  }

  async function excluirHistoricoItem(indice: number) {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/LoginScreen');
      return;
    }

    setRemovingItemIndex(indice);
    try {
      const atualizado = historicoSalvo.filter((_, idx) => idx !== indice);
      await persistirHistoricoCompleto(token, atualizado);
      Alert.alert('Sucesso', 'Resultado removido do histórico.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao excluir resultado.';
      Alert.alert('Erro', message);
    } finally {
      setRemovingItemIndex(null);
    }
  }

  async function salvarResultadoManual() {
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      router.replace('/LoginScreen');
      return;
    }

    const dezenas = parseDezenasInput(manualDezenas);
    if (dezenas.length !== 15) {
      Alert.alert('Dados inválidos', 'Informe exatamente 15 dezenas válidas (1 a 25).');
      return;
    }

    const dataConcurso = manualData.trim();
    if (!dataConcurso) {
      Alert.alert('Data obrigatória', 'Informe a data do concurso (ex.: 03/06/2026).');
      return;
    }

    setSavingManual(true);
    try {
      await salvarResultadoNoHistorico(token, dezenas, dataConcurso);
      await carregarHistoricoSalvo(token);
      setResultado((atual) => ({
        concurso: atual?.concurso || 'Manual',
        data: dataConcurso,
        dezenas,
        premioEstimado: atual?.premioEstimado || 'N/D',
      }));
      setManualData('');
      setManualDezenas('');
      Alert.alert('Sucesso', 'Resultado manual salvo com sucesso.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao salvar resultado manual.';
      Alert.alert('Erro', message);
    } finally {
      setSavingManual(false);
    }
  }

  useEffect(() => {
    async function carregarResultados() {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        router.replace('/LoginScreen');
        return;
      }

      try {
        const data = await buscarResultadoOficialLotofacil();
        setResultado(data);

        if (Array.isArray(data?.dezenas) && data.dezenas.length > 0) {
          const dezenasAtuais = data.dezenas.map((numero) => String(numero));
          const dataConcurso = String(data?.data || '').trim();
          await salvarResultadoNoHistorico(token, dezenasAtuais, dataConcurso);
        }

        await carregarHistoricoSalvo(token);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro ao buscar resultados.';
        setErro(msg);
        await carregarHistoricoSalvo(token);
      } finally {
        setLoading(false);
      }
    }

    carregarResultados();
  }, [router]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DARK_BG }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={{ color: TEXT_PRIMARY }}>Carregando resultados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DARK_BG }}>
        <View style={styles.center}>
          <Text style={{ color: '#ff6b6b' }}>{erro}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!resultado) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: DARK_BG }}>
        <View style={styles.center}>
          <Text style={{ color: '#ff6b6b' }}>Resultado indisponível no momento.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: DARK_BG }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.titulo}>Resultados Oficiais Lotofácil</Text>
        <Text style={styles.info}>Concurso: {resultado.concurso}</Text>
        <Text style={styles.info}>Data: {resultado.data}</Text>
        <View style={styles.numerosContainer}>
          {resultado.dezenas.map((dezena, idx) => (
            <View key={idx} style={styles.numeroBox}>
              <Text style={styles.numero}>{dezena}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.info}>Prêmio estimado: {resultado.premioEstimado}</Text>

        <View style={styles.historicoCard}>
          <Text style={styles.manualTitulo}>Histórico Salvo (Oficiais + Manuais)</Text>
          {historicoSalvo.length === 0 ? (
            <Text style={styles.manualSubtitulo}>Nenhum resultado salvo ainda.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {historicoSalvo.map((item, idx) => (
                <View key={`${item.data}-${item.dezenas.join('-')}-${idx}`} style={styles.historicoItem}>
                  <View style={styles.historicoItemHeader}>
                    <Text style={styles.historicoData}>{item.data || 'Data não informada'}</Text>
                    <TouchableOpacity
                      onPress={() => excluirHistoricoItem(idx)}
                      disabled={removingItemIndex !== null}
                      style={styles.botaoExcluirHistorico}
                    >
                      <Text style={styles.botaoExcluirHistoricoTexto}>
                        {removingItemIndex === idx ? 'Excluindo...' : 'Excluir'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.historicoDezenas}>{item.dezenas.join(' - ')}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.manualCard}>
          <Text style={styles.manualTitulo}>Adicionar Resultado Anterior</Text>
          <Text style={styles.manualSubtitulo}>Informe a data e as 15 dezenas para salvar no histórico.</Text>

          <TextInput
            style={styles.input}
            value={manualData}
            onChangeText={setManualData}
            placeholder="Data (ex.: 03/06/2026)"
            placeholderTextColor="#888"
          />

          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={manualDezenas}
            onChangeText={setManualDezenas}
            placeholder="Dezenas (ex.: 02 03 05 09 13 14 15 16 17 18 20 21 22 23 25)"
            placeholderTextColor="#888"
            multiline
          />

          <TouchableOpacity
            style={[styles.botaoSalvar, savingManual ? styles.botaoDisabled : null]}
            onPress={salvarResultadoManual}
            disabled={savingManual}
          >
            <Text style={styles.botaoSalvarTexto}>{savingManual ? 'Salvando...' : 'Salvar Resultado Manual'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: DARK_BG,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    color: TEXT_PRIMARY,
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
    color: TEXT_SECONDARY,
  },
  numerosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginVertical: 16,
  },
  numeroBox: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    margin: 4,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numero: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  manualCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: DARK_BORDER,
    borderRadius: 12,
    padding: 14,
  },
  historicoCard: {
    marginTop: 24,
    width: '100%',
    backgroundColor: DARK_CARD,
    borderWidth: 1,
    borderColor: DARK_BORDER,
    borderRadius: 12,
    padding: 14,
  },
  historicoItem: {
    borderWidth: 1,
    borderColor: '#343434',
    backgroundColor: '#101010',
    borderRadius: 8,
    padding: 10,
  },
  historicoItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 12,
  },
  historicoData: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    flex: 1,
  },
  historicoDezenas: {
    color: TEXT_SECONDARY,
    fontSize: 12,
  },
  botaoExcluirHistorico: {
    backgroundColor: '#e53935',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  botaoExcluirHistoricoTexto: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11,
  },
  manualTitulo: {
    color: TEXT_PRIMARY,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 6,
  },
  manualSubtitulo: {
    color: TEXT_SECONDARY,
    fontSize: 12,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3a3a3a',
    backgroundColor: '#111',
    borderRadius: 8,
    padding: 10,
    color: TEXT_PRIMARY,
    marginBottom: 10,
  },
  inputMultiline: {
    minHeight: 66,
    textAlignVertical: 'top',
  },
  botaoSalvar: {
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  botaoDisabled: {
    opacity: 0.6,
  },
  botaoSalvarTexto: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 14,
  },
});
