import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResultadosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { jogos } = useLocalSearchParams();
  let jogosArray = [];
  try {
    jogosArray = jogos ? JSON.parse(jogos) : [];
  } catch {
    jogosArray = [];
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#050505' }}>
      <View style={{ flex: 1, alignItems: 'center', padding: 24 }}>
      <Text style={{ fontSize: 24, marginBottom: 16, color: '#fff', fontWeight: '700' }}>Resultados da Lotofácil</Text>
      <ScrollView style={{ width: '100%' }}>
        {jogosArray.length === 0 && (
          <Text style={{ fontSize: 16, textAlign: 'center', marginVertical: 16, color: '#cfcfcf' }}>Nenhum jogo gerado.</Text>
        )}
        {jogosArray.map((jogo, idx) => (
          <View key={idx} style={{ marginBottom: 28, alignItems: 'center', backgroundColor: '#121212', borderColor: '#2a2a2a', borderWidth: 1, borderRadius: 16, padding: 16, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 8, elevation: 3 }}>
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
                          backgroundColor: n !== undefined ? '#1976d2' : '#1f1f1f',
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
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: n !== undefined ? '#fff' : '#777' }}>{n !== undefined ? n : ''}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.back()}
        style={{
          marginTop: 10,
          marginBottom: Math.max(insets.bottom, 12),
          backgroundColor: '#1976d2',
          paddingVertical: 12,
          paddingHorizontal: 26,
          borderRadius: 10,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Voltar</Text>
      </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
