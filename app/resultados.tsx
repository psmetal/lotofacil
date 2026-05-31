import React from 'react';
import { View, Text, Button, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function ResultadosScreen() {
  const router = useRouter();
  const { jogos } = useLocalSearchParams();
  let jogosArray = [];
  try {
    jogosArray = jogos ? JSON.parse(jogos) : [];
  } catch {
    jogosArray = [];
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, marginBottom: 16 }}>Resultados da Lotofácil</Text>
      <ScrollView style={{ width: '100%' }}>
        {jogosArray.length === 0 && (
          <Text style={{ fontSize: 16, textAlign: 'center', marginVertical: 16 }}>Nenhum jogo gerado.</Text>
        )}
        {jogosArray.map((jogo, idx) => (
          <View key={idx} style={{ marginBottom: 28, alignItems: 'center', backgroundColor: '#f0f7ff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#1976d2' }}>Jogo {idx + 1}</Text>
            <View style={{ flexDirection: 'column', gap: 6 }}>
              {[0, 1, 2].map(linha => (
                <View key={linha} style={{ flexDirection: 'row', gap: 6, marginBottom: linha < 2 ? 6 : 0 }}>
                  {[0, 1, 2, 3, 4].map(col => {
                    const n = jogo[linha * 5 + col];
                    return (
                      <View
                        key={col}
                        style={{
                          width: 38,
                          height: 38,
                          backgroundColor: n !== undefined ? '#1976d2' : '#e3e3e3',
                          borderRadius: 10,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginHorizontal: 2,
                          marginVertical: 2,
                          shadowColor: '#1976d2',
                          shadowOpacity: 0.12,
                          shadowRadius: 4,
                          elevation: n !== undefined ? 2 : 0,
                        }}
                      >
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: n !== undefined ? '#fff' : '#333' }}>{n !== undefined ? n : ''}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <Button title="Voltar" onPress={() => router.back()} />
    </View>
  );
}
