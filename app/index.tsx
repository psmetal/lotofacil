import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Switch, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiGetAuth, apiPatch } from '../services/api';
import { lerCacheResultadosLotofacil, salvarResultadoLotofacilLocal } from '../services/resultadosLocalStorage';
import { buscarResultadoOficialLotofacil } from '../services/resultadosOficiaisService';
import {
	lerJogosGeradosLocais,
	salvarJogosGeradosLocais,
	limparJogosGeradosLocais,
} from '../services/jogosGeradosStorage';

const DARK_BG = '#050505';
const DARK_CARD = '#121212';
const DARK_CARD_SOFT = '#1a1a1a';
const DARK_BORDER = '#2a2a2a';
const TEXT_PRIMARY = '#ffffff';
const TEXT_SECONDARY = '#cfcfcf';

function contarNumerosRepetidos(historico) {
	const contagem = new Map();

	for (let numero = 1; numero <= 25; numero += 1) {
		contagem.set(numero, 0);
	}

	for (const sorteio of historico) {
		if (!Array.isArray(sorteio)) {
			continue;
		}

		for (const numero of sorteio) {
			const valor = Number(numero);
			if (!Number.isInteger(valor) || valor < 1 || valor > 25) {
				continue;
			}

			contagem.set(valor, (contagem.get(valor) || 0) + 1);
		}
	}

	return Array.from(contagem.entries())
		.sort((a, b) => {
			if (a[1] !== b[1]) {
				return b[1] - a[1];
			}

			return a[0] - b[0];
		})
		.map(([numero]) => numero);
}

function listarNumerosRepetidosComQuantidade(historico) {
	const contagem = new Map();

	for (let numero = 1; numero <= 25; numero += 1) {
		contagem.set(numero, 0);
	}

	for (const sorteio of historico) {
		if (!Array.isArray(sorteio)) {
			continue;
		}

		for (const numero of sorteio) {
			const valor = Number(numero);
			if (!Number.isInteger(valor) || valor < 1 || valor > 25) {
				continue;
			}

			contagem.set(valor, (contagem.get(valor) || 0) + 1);
		}
	}

	return Array.from(contagem.entries())
		.map(([numero, total]) => ({ numero, total }))
		.sort((a, b) => {
			if (a.total !== b.total) {
				return b.total - a.total;
			}

			return a.numero - b.numero;
		});
}

function listarNumerosMenosFrequentesComQuantidade(historico) {
	const contagem = new Map();

	for (let numero = 1; numero <= 25; numero += 1) {
		contagem.set(numero, 0);
	}

	for (const sorteio of historico) {
		if (!Array.isArray(sorteio)) {
			continue;
		}

		for (const numero of sorteio) {
			const valor = Number(numero);
			if (!Number.isInteger(valor) || valor < 1 || valor > 25) {
				continue;
			}

			contagem.set(valor, (contagem.get(valor) || 0) + 1);
		}
	}

	return Array.from(contagem.entries())
		.map(([numero, total]) => ({ numero, total }))
		.sort((a, b) => {
			if (a.total !== b.total) {
				return a.total - b.total;
			}

			return a.numero - b.numero;
		});
}

function normalizarHistoricoSemDuplicidade(user) {
	const historicoDetalhado = Array.isArray(user?.historico_resultados_lotofacil_detalhado)
		? user.historico_resultados_lotofacil_detalhado
		: [];

	if (historicoDetalhado.length > 0) {
		const vistos = new Set();
		const jogos = [];

		for (const item of historicoDetalhado) {
			const dezenas = Array.isArray(item?.dezenas)
				? item.dezenas
				: Array.isArray(item)
					? item
					: null;

			if (!Array.isArray(dezenas) || dezenas.length === 0) {
				continue;
			}

			const dataConcurso = String(item?.data || '').trim();
			const chave = dataConcurso || dezenas.map((numero) => String(numero)).join('-');
			if (vistos.has(chave)) {
				continue;
			}

			vistos.add(chave);
			jogos.push(dezenas);
		}

		return jogos;
	}

	const historicoSimples = Array.isArray(user?.historico_resultados_lotofacil)
		? user.historico_resultados_lotofacil
		: [];

	const vistos = new Set();
	const jogos = [];

	for (const sorteio of historicoSimples) {
		if (!Array.isArray(sorteio) || sorteio.length === 0) {
			continue;
		}

		const chave = sorteio.map((numero) => String(numero)).join('-');
		if (vistos.has(chave)) {
			continue;
		}

		vistos.add(chave);
		jogos.push(sorteio);
	}

	return jogos;
}

function gerarJogoComBaseNosRepetidos(qtdNumeros, repetidos) {
	const sementes = [...new Set(repetidos)];
	const jogo = [];

	while (jogo.length < qtdNumeros && sementes.length > 0) {
		const indice = Math.floor(Math.random() * sementes.length);
		jogo.push(sementes.splice(indice, 1)[0]);
	}

	while (jogo.length < qtdNumeros) {
		const numero = Math.floor(Math.random() * 25) + 1;
		if (!jogo.includes(numero)) {
			jogo.push(numero);
		}
	}

	return jogo.sort((a, b) => a - b);
}

function normalizarJogosSemDuplicidade(jogos) {
	if (!Array.isArray(jogos)) {
		return [];
	}

	const vistos = new Set();
	const lista = [];

	for (const jogo of jogos) {
		if (!Array.isArray(jogo) || jogo.length === 0) {
			continue;
		}

		const numeros = jogo
			.map((numero) => Number(numero))
			.filter((numero) => Number.isInteger(numero) && numero >= 1 && numero <= 25)
			.sort((a, b) => a - b);

		if (numeros.length === 0) {
			continue;
		}

		const chave = numeros.join('-');
		if (vistos.has(chave)) {
			continue;
		}

		vistos.add(chave);
		lista.push(numeros);
	}

	return lista.slice(0, 100);
}

function montarBaseComFallback(basePrincipal, baseMaisFrequente, tamanhoMinimo) {
	const selecionados = [];
	const vistos = new Set();

	const adicionar = (lista) => {
		for (const numero of lista) {
			const valor = Number(numero);
			if (!Number.isInteger(valor) || valor < 1 || valor > 25 || vistos.has(valor)) {
				continue;
			}

			vistos.add(valor);
			selecionados.push(valor);

			if (selecionados.length >= tamanhoMinimo) {
				return;
			}
		}
	};

	adicionar(basePrincipal);

	if (selecionados.length < tamanhoMinimo) {
		adicionar(baseMaisFrequente);
	}

	return selecionados;
}

export default function HomeScreen() {
	const [qtdJogos, setQtdJogos] = useState('1');
	const [qtdNumeros, setQtdNumeros] = useState(15);
	const opcoesNumeros = [15, 16, 17];
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [carregandoHistorico, setCarregandoHistorico] = useState(false);
	const [historicoDisponivel, setHistoricoDisponivel] = useState(false);
	const [usarHistorico, setUsarHistorico] = useState(true);
	const [repetidosBase, setRepetidosBase] = useState([]);
	const [repetidosResumo, setRepetidosResumo] = useState([]);
	const [menosFrequentesResumo, setMenosFrequentesResumo] = useState([]);
	const [modoGeracao, setModoGeracao] = useState('frequentes');
	const [concursosUsados, setConcursosUsados] = useState(0);
	const [jogosSalvos, setJogosSalvos] = useState([]);
	const insets = useSafeAreaInsets();

	const tituloModoSelecionado = modoGeracao === 'menos'
		? 'Menos frequentes'
		: modoGeracao === 'aleatorio'
			? 'Aleatório'
			: 'Mais frequentes';

	const descricaoModoSelecionado = modoGeracao === 'menos'
		? 'Prioriza dezenas que menos saíram e completa com as mais frequentes quando faltar base.'
		: modoGeracao === 'aleatorio'
			? 'Gera jogos sem usar base histórica.'
			: 'Prioriza dezenas que mais saíram nos últimos concursos.';

	const resumoModoSelecionado = modoGeracao === 'menos'
		? menosFrequentesResumo
		: modoGeracao === 'aleatorio'
			? []
			: repetidosResumo;

	const corModoSelecionado = modoGeracao === 'menos'
		? '#00897b'
		: modoGeracao === 'aleatorio'
			? '#6d4c41'
			: '#1454b8';

	const selecionarModoGeracao = useCallback(
		(modo) => {
			setModoGeracao(modo);

			if (modo === 'aleatorio') {
				setUsarHistorico(false);
				return;
			}

			if (historicoDisponivel) {
				setUsarHistorico(true);
			}
		},
		[historicoDisponivel]
	);

	const sincronizarResultadosOficiais = useCallback(async (token) => {
		try {
			const data = await buscarResultadoOficialLotofacil();

			if (!Array.isArray(data?.dezenas) || data.dezenas.length === 0) {
				return;
			}

			const dezenasAtuais = data.dezenas.map((numero) => String(numero));
			const dataConcurso = String(data?.data || '').trim();

			await salvarResultadoLotofacilLocal(dataConcurso, dezenasAtuais);

			const cacheLocal = await lerCacheResultadosLotofacil();
			await apiPatch(
				'/me/lotofacil',
				{
					historico_resultados_lotofacil: cacheLocal.historico_resultados_lotofacil,
					historico_resultados_lotofacil_detalhado: cacheLocal.historico_resultados_lotofacil_detalhado,
					ultimos_resultados_lotofacil: dezenasAtuais,
					ultima_data_resultado_lotofacil: dataConcurso,
				},
				token
			);
		} catch (error) {
			console.warn('Falha ao sincronizar resultados oficiais na Home:', error);
		}
	}, []);

	const carregarHistorico = useCallback(async () => {
		const token = await AsyncStorage.getItem('token');

		if (!token) {
			router.replace('/LoginScreen');
			setLoading(false);
			return;
		}

		setCarregandoHistorico(true);

		const aplicarHistorico = (historico) => {
			setHistoricoDisponivel(historico.length > 0);
			setConcursosUsados(historico.length);
			setRepetidosBase(contarNumerosRepetidos(historico));
			setRepetidosResumo(listarNumerosRepetidosComQuantidade(historico));
			setMenosFrequentesResumo(listarNumerosMenosFrequentesComQuantidade(historico));
			setUsarHistorico(historico.length > 0);
			setModoGeracao((atual) => {
				if (historico.length === 0) {
					return 'aleatorio';
				}

				return atual;
			});
		};

		try {
			await sincronizarResultadosOficiais(token);
			const user = await apiGetAuth('/me', token);
			const historico = normalizarHistoricoSemDuplicidade(user);
			const jogosUsuario = normalizarJogosSemDuplicidade(user?.jogos_gerados_lotofacil);
			setJogosSalvos(jogosUsuario);
			await salvarJogosGeradosLocais(jogosUsuario);

			if (historico.length > 0) {
				aplicarHistorico(historico);
			} else {
				const cacheLocal = await lerCacheResultadosLotofacil();
				aplicarHistorico(cacheLocal.historico_resultados_lotofacil);
			}
		} catch (error) {
			console.warn('Erro ao carregar histórico do usuário:', error);
			const cacheLocal = await lerCacheResultadosLotofacil();
			const jogosLocais = await lerJogosGeradosLocais();
			setJogosSalvos(jogosLocais);
			aplicarHistorico(cacheLocal.historico_resultados_lotofacil);
		} finally {
			setCarregandoHistorico(false);
			setLoading(false);
		}
	}, [router, sincronizarResultadosOficiais]);

	const persistirJogosGerados = useCallback(
		async (novosJogos, token) => {
			const normalizados = normalizarJogosSemDuplicidade(novosJogos);
			setJogosSalvos(normalizados);
			await salvarJogosGeradosLocais(normalizados);

			if (!token) {
				return;
			}

			try {
				await apiPatch('/me/jogos-gerados', { jogos_gerados_lotofacil: normalizados }, token);
			} catch (error) {
				console.warn('Erro ao salvar jogos gerados no backend:', error);
			}
		},
		[]
	);

	useFocusEffect(
		useCallback(() => {
			carregarHistorico();
		}, [carregarHistorico])
	);

    async function gerarJogos() {
		const total = Math.max(1, parseInt(qtdJogos) || 1);
		const token = await AsyncStorage.getItem('token');
		const historicoAtivo = usarHistorico && historicoDisponivel;
		const minimoBaseHistorica = Math.max(10, qtdNumeros - 2);
		const frequentesBase = historicoAtivo
			? repetidosResumo
				.slice(0, 25)
				.map((item) => item.numero)
			: [];
		const menosFrequentesBase = historicoAtivo
			? menosFrequentesResumo
				.slice(0, minimoBaseHistorica)
				.map((item) => item.numero)
			: [];

		const baseSelecionada = (() => {
			if (!historicoAtivo || modoGeracao === 'aleatorio') {
				return [];
			}

			if (modoGeracao === 'menos') {
				return menosFrequentesBase;
			}

			return frequentesBase;
		})();

		const baseComFallback = montarBaseComFallback(baseSelecionada, frequentesBase, qtdNumeros);
		const jogos = Array.from({ length: total }, () => gerarJogoComBaseNosRepetidos(qtdNumeros, baseComFallback));
		const combinados = normalizarJogosSemDuplicidade([...jogos, ...jogosSalvos]);
		await persistirJogosGerados(combinados, token);
		router.push({ pathname: '/resultados', params: { jogos: JSON.stringify(jogos) } });
	}

	async function excluirJogoSalvo(indice) {
		const token = await AsyncStorage.getItem('token');
		const atualizados = jogosSalvos.filter((_, idx) => idx !== indice);
		await persistirJogosGerados(atualizados, token);
	}

	async function limparJogosSalvos() {
		const token = await AsyncStorage.getItem('token');
		setJogosSalvos([]);
		await limparJogosGeradosLocais();

		if (!token) {
			return;
		}

		try {
			await apiPatch('/me/jogos-gerados', { jogos_gerados_lotofacil: [] }, token);
		} catch (error) {
			console.warn('Erro ao limpar jogos no backend:', error);
		}
	}

	async function sair() {
		await AsyncStorage.removeItem('token');
		router.replace('/LoginScreen');
	}

	if (loading) {
		return (
			<SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: DARK_BG }}>
				<ActivityIndicator size="large" color="#1976d2" />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: DARK_BG }}>
			<ScrollView
				contentContainerStyle={{
					paddingHorizontal: 24,
					paddingTop: 12,
					paddingBottom: insets.bottom + 136,
					alignItems: 'center',
					backgroundColor: DARK_BG,
				}}
				showsVerticalScrollIndicator={false}
			>
				<View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 14 }}>
					<TouchableOpacity
						style={{
							backgroundColor: '#ef5350',
							paddingVertical: 8,
							paddingHorizontal: 14,
							borderRadius: 8,
						}}
						onPress={sair}
					>
						<Text style={{ color: '#fff', fontWeight: 'bold' }}>Sair</Text>
					</TouchableOpacity>
				</View>

				{carregandoHistorico ? (
					<View style={{ marginBottom: 18, padding: 12, backgroundColor: DARK_CARD_SOFT, borderRadius: 10, borderWidth: 1, borderColor: DARK_BORDER }}>
						<Text style={{ color: '#1976d2', fontWeight: '600' }}>Carregando histórico salvo...</Text>
					</View>
				) : historicoDisponivel ? (
					<View
						style={{
							marginBottom: 18,
							padding: 16,
							borderRadius: 16,
							backgroundColor: DARK_CARD,
							borderWidth: 1,
							borderColor: DARK_BORDER,
							alignSelf: 'stretch',
						}}
					>
						<View style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
							<View style={{ width: 6, borderRadius: 999, backgroundColor: usarHistorico ? '#1454b8' : '#b6c7e6' }} />
							<View style={{ flex: 1 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
									<View style={{ flex: 1 }}>
										<Text style={{ color: TEXT_PRIMARY, fontWeight: '800', fontSize: 16 }}>
											Modo: {tituloModoSelecionado}
										</Text>
										<Text style={{ color: TEXT_SECONDARY, marginTop: 5, fontSize: 12, lineHeight: 18 }}>
											{descricaoModoSelecionado}
										</Text>
									</View>
									<Switch
										value={usarHistorico}
										onValueChange={setUsarHistorico}
										trackColor={{ false: '#303030', true: '#1454b8' }}
										thumbColor={usarHistorico ? '#ffffff' : '#b0b0b0'}
										ios_backgroundColor="#303030"
									/>
								</View>

								<View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
									<View
										style={{
											backgroundColor: usarHistorico ? '#1454b8' : '#c9d6eb',
											paddingHorizontal: 10,
											paddingVertical: 5,
											borderRadius: 999,
											marginRight: 8,
										}}
									>
										<Text style={{ color: '#fff', fontWeight: '800', fontSize: 12 }}>
											{usarHistorico ? 'Ativo' : 'Inativo'}
										</Text>
									</View>
									<Text style={{ color: TEXT_SECONDARY, fontSize: 12 }}>
										Base recalculada a cada abertura da tela
									</Text>
								</View>
							</View>
						</View>

						<View style={{ marginTop: 12 }}>
							<Text style={{ color: TEXT_PRIMARY, fontWeight: '700', marginBottom: 8 }}>Tipo de jogo</Text>
							<View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
								<TouchableOpacity
									onPress={() => selecionarModoGeracao('frequentes')}
									activeOpacity={0.8}
									style={{
										backgroundColor: modoGeracao === 'frequentes' ? '#1454b8' : '#232323',
										paddingHorizontal: 10,
										paddingVertical: 8,
										borderRadius: 999,
										borderWidth: modoGeracao === 'frequentes' ? 0 : 1,
										borderColor: '#3a3a3a',
									}}
								>
									<Text style={{ color: modoGeracao === 'frequentes' ? '#fff' : TEXT_SECONDARY, fontWeight: '700', fontSize: 12 }}>
										Mais frequentes
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => selecionarModoGeracao('menos')}
									activeOpacity={0.8}
									style={{
										backgroundColor: modoGeracao === 'menos' ? '#1454b8' : '#232323',
										paddingHorizontal: 10,
										paddingVertical: 8,
										borderRadius: 999,
										borderWidth: modoGeracao === 'menos' ? 0 : 1,
										borderColor: '#3a3a3a',
									}}
								>
									<Text style={{ color: modoGeracao === 'menos' ? '#fff' : TEXT_SECONDARY, fontWeight: '700', fontSize: 12 }}>
										Menos frequentes
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => selecionarModoGeracao('aleatorio')}
									activeOpacity={0.8}
									style={{
										backgroundColor: modoGeracao === 'aleatorio' ? '#1454b8' : '#232323',
										paddingHorizontal: 10,
										paddingVertical: 8,
										borderRadius: 999,
										borderWidth: modoGeracao === 'aleatorio' ? 0 : 1,
										borderColor: '#3a3a3a',
									}}
								>
									<Text style={{ color: modoGeracao === 'aleatorio' ? '#fff' : TEXT_SECONDARY, fontWeight: '700', fontSize: 12 }}>
										Aleatório
									</Text>
								</TouchableOpacity>
							</View>
							<Text style={{ marginTop: 8, color: corModoSelecionado, fontWeight: '700', fontSize: 12 }}>
								Modo ativo: {tituloModoSelecionado}
							</Text>
						</View>

						<View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: DARK_BORDER }}>
							<View style={{ marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
								<Text style={{ color: TEXT_SECONDARY, fontWeight: '600' }}>
									Concursos usados no cálculo
								</Text>
								<View style={{ backgroundColor: '#1454b8', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
									<Text style={{ color: '#fff', fontWeight: '800' }}>{concursosUsados}</Text>
								</View>
							</View>
							<Text style={{ color: TEXT_PRIMARY, fontWeight: '700', marginBottom: 10 }}>
								{modoGeracao === 'aleatorio' ? 'Referência do histórico (informativo)' : `Números de referência: ${tituloModoSelecionado}`}
							</Text>
							{resumoModoSelecionado.length > 0 ? (
								<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
									{resumoModoSelecionado.slice(0, 8).map((item) => (
										<View
											key={item.numero}
											style={{
												backgroundColor: corModoSelecionado,
												paddingVertical: 9,
												paddingHorizontal: 14,
												borderRadius: 999,
												shadowColor: corModoSelecionado,
												shadowOpacity: 0.12,
												shadowRadius: 4,
												elevation: 2,
											}}
										>
											<Text style={{ color: '#fff', fontWeight: '700' }}>
												{item.numero} x{item.total}
											</Text>
										</View>
									))}
								</View>
							) : (
								<Text style={{ color: TEXT_SECONDARY, lineHeight: 18 }}>
									No modo aleatório não há referência fixa de números.
								</Text>
							)}

						</View>
					</View>
				) : (
					<View style={{ marginBottom: 18, padding: 12, backgroundColor: DARK_CARD_SOFT, borderRadius: 10, alignSelf: 'stretch', borderWidth: 1, borderColor: DARK_BORDER }}>
						<Text style={{ color: TEXT_SECONDARY, textAlign: 'center' }}>
							Sem histórico salvo ainda. Os jogos serão gerados aleatoriamente.
						</Text>
					</View>
				)}

				<Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: TEXT_PRIMARY }}>
					Escolha quantos jogos deseja gerar
				</Text>
				<Text style={{ fontSize: 16, color: TEXT_SECONDARY }}>Quantidade de jogos:</Text>
				<TextInput
					style={{ borderWidth: 1, borderColor: '#3a3a3a', borderRadius: 6, padding: 8, minWidth: 60, fontSize: 16, marginBottom: 16, textAlign: 'center', color: TEXT_PRIMARY, backgroundColor: '#111' }}
					keyboardType="numeric"
					value={qtdJogos}
					onChangeText={setQtdJogos}
					placeholder="Ex: 5"
					placeholderTextColor="#808080"
				/>
				<Text style={{ fontSize: 16, color: TEXT_SECONDARY }}>Quantidade de números por jogo:</Text>
				<View style={{ flexDirection: 'row', marginVertical: 12 }}>
					{opcoesNumeros.map((num) => (
						<TouchableOpacity
							key={num}
							onPress={() => setQtdNumeros(num)}
							style={{
								backgroundColor: qtdNumeros === num ? '#1976d2' : '#232323',
								padding: 10,
								borderRadius: 6,
								marginHorizontal: 6,
								borderWidth: qtdNumeros === num ? 0 : 1,
								borderColor: '#3a3a3a',
							}}
						>
							<Text style={{ color: qtdNumeros === num ? '#fff' : TEXT_SECONDARY, fontWeight: 'bold' }}>{num}</Text>
						</TouchableOpacity>
					))}
				</View>

				<View
					style={{
						marginTop: 20,
						padding: 14,
						borderRadius: 12,
						backgroundColor: DARK_CARD,
						borderWidth: 1,
						borderColor: DARK_BORDER,
						alignSelf: 'stretch',
					}}
				>
					<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
						<Text style={{ fontWeight: '800', color: TEXT_PRIMARY, fontSize: 16 }}>Jogos salvos</Text>
						<TouchableOpacity
							onPress={limparJogosSalvos}
							style={{ backgroundColor: '#ef5350', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
						>
							<Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Limpar tudo</Text>
						</TouchableOpacity>
					</View>

					{jogosSalvos.length === 0 ? (
						<Text style={{ marginTop: 10, color: TEXT_SECONDARY }}>Nenhum jogo salvo ainda.</Text>
					) : (
						<View style={{ marginTop: 10, gap: 8 }}>
							{jogosSalvos.slice(0, 10).map((jogo, idx) => (
								<View
									key={`${jogo.join('-')}-${idx}`}
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										justifyContent: 'space-between',
										paddingVertical: 8,
										paddingHorizontal: 10,
										backgroundColor: DARK_CARD_SOFT,
										borderRadius: 8,
										borderWidth: 1,
										borderColor: DARK_BORDER,
									}}
								>
									<Text style={{ flex: 1, marginRight: 8, color: TEXT_PRIMARY }}>{jogo.join(' - ')}</Text>
									<TouchableOpacity
										onPress={() => excluirJogoSalvo(idx)}
										style={{ backgroundColor: '#e53935', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
									>
										<Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Excluir</Text>
									</TouchableOpacity>
								</View>
							))}
						</View>
					)}
				</View>
			</ScrollView>

			<View
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					paddingHorizontal: 24,
					paddingTop: 12,
					paddingBottom: Math.max(insets.bottom, 12),
					backgroundColor: 'rgba(10,10,10,0.98)',
					borderTopWidth: 1,
					borderTopColor: DARK_BORDER,
					shadowColor: '#0f2b46',
					shadowOpacity: 0.12,
					shadowRadius: 10,
					shadowOffset: { width: 0, height: -4 },
					elevation: 14,
					gap: 10,
				}}
			>
				<TouchableOpacity
					onPress={gerarJogos}
					style={{
						backgroundColor: '#1976d2',
						paddingVertical: 13,
						borderRadius: 10,
						alignItems: 'center',
					}}
				>
					<Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Gerar Jogos</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={() => router.push('/ResultadosOficiais')}
					style={{
						backgroundColor: '#43a047',
						paddingVertical: 12,
						borderRadius: 10,
						alignItems: 'center',
					}}
				>
					<Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Resultados Oficiais</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}