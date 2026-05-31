import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
	const [qtdJogos, setQtdJogos] = useState('1');
	const [qtdNumeros, setQtdNumeros] = useState(15);
	const opcoesNumeros = [15, 16, 17];
	const router = useRouter();
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		AsyncStorage.getItem('token').then(token => {
			if (!token) {
				router.replace('/LoginScreen');
			}
			setLoading(false);
		});
	}, []);

	function gerarJogos() {
		const total = Math.max(1, parseInt(qtdJogos) || 1);
		const jogos = [];
		for (let i = 0; i < total; i++) {
			const numeros = [];
			while (numeros.length < qtdNumeros) {
				const n = Math.floor(Math.random() * 25) + 1;
				if (!numeros.includes(n)) {
					numeros.push(n);
				}
			}
			jogos.push(numeros.sort((a, b) => a - b));
		}
		router.push({ pathname: '/resultados', params: { jogos: JSON.stringify(jogos) } });
	}

	if (loading) {
		return (
			<SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
				<ActivityIndicator size="large" color="#1976d2" />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
			<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
				<Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24 }}>
					Escolha quantos jogos deseja gerar
				</Text>
				<Text style={{ fontSize: 16 }}>Quantidade de jogos:</Text>
				<TextInput
					style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, minWidth: 60, fontSize: 16, marginBottom: 16, textAlign: 'center' }}
					keyboardType="numeric"
					value={qtdJogos}
					onChangeText={setQtdJogos}
					placeholder="Ex: 5"
				/>
				<Text style={{ fontSize: 16 }}>Quantidade de números por jogo:</Text>
				<View style={{ flexDirection: 'row', marginVertical: 12 }}>
					{opcoesNumeros.map((num) => (
						<TouchableOpacity
							key={num}
							onPress={() => setQtdNumeros(num)}
							style={{
								backgroundColor: qtdNumeros === num ? '#1976d2' : '#eee',
								padding: 10,
								borderRadius: 6,
								marginHorizontal: 6,
							}}
						>
							<Text style={{ color: qtdNumeros === num ? '#fff' : '#333', fontWeight: 'bold' }}>{num}</Text>
						</TouchableOpacity>
					))}
				</View>
				<Button title="Gerar Jogos" onPress={gerarJogos} />

				{/* Botão para Resultados Oficiais */}
				<TouchableOpacity
					style={{
						marginTop: 24,
						backgroundColor: '#43a047',
						paddingVertical: 12,
						paddingHorizontal: 24,
						borderRadius: 8,
					}}
					onPress={() => router.push('/ResultadosOficiais')}
				>
					<Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Resultados Oficiais</Text>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
}