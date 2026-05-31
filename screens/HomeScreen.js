import React, { useState } from 'react';
import { View, Text, TextInput, Button, TouchableOpacity } from 'react-native';

export default function HomeScreen({ navigation }) {
  const [qtdJogos, setQtdJogos] = useState('1');
  const [qtdNumeros, setQtdNumeros] = useState(15);
  const opcoesNumeros = [15, 16, 17];

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
    navigation.navigate('Resultados', { jogos });
  }

  return (
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
    </View>
  );
}
