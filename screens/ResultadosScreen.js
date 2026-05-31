
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, ActivityIndicator } from 'react-native';
import { buscarResultados } from '../services/resultadosService';

export default function ResultadosScreen({ route, navigation }) {
  const [jogos, setJogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    async function fetchResultados() {
      try {
        const data = await buscarResultados();
        setJogos(data.jogos || []);
      } catch (e) {
        setErro('Erro ao buscar resultados.');
      } finally {
        setLoading(false);
      }
    }
    fetchResultados();
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Resultados da Lotofácil</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#000" style={{ marginTop: 32 }} />
      ) : erro ? (
        <Text style={{ color: 'red', marginVertical: 16 }}>{erro}</Text>
      ) : (
        <ScrollView style={{ width: '100%' }}>
          {jogos.length === 0 && (
            <Text style={{ fontSize: 16, textAlign: 'center', marginVertical: 16 }}>Nenhum jogo encontrado.</Text>
          )}
          {jogos.map((jogo, idx) => (
            <Text key={idx} style={{ fontSize: 18, marginVertical: 6 }}>
              Jogo {idx + 1}: {Array.isArray(jogo) ? jogo.join(', ') : JSON.stringify(jogo)}
            </Text>
          ))}
        </ScrollView>
      )}
      <Button title="Voltar" onPress={() => navigation.goBack()} />
    </View>
  );
}
