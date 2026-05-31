import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, StyleSheet, SafeAreaView } from 'react-native';


// Permite trocar facilmente o tipo de loteria
const LOTERIA = 'lotofacil';
const API_URL = `https://loteriascaixa-api.herokuapp.com/api/${LOTERIA}/latest`;

export default function ResultadosOficiais() {
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const router = useRouter();

  useEffect(() => {
    AsyncStorage.getItem('token').then(token => {
      if (!token) {
        router.replace('/LoginScreen');
      } else {
        fetch(API_URL)
          .then((res) => res.json())
          .then((data) => {
            setResultado(data);
            setLoading(false);
          })
          .catch((err) => {
            setErro('Erro ao buscar resultados.');
            setLoading(false);
          });
      }
    });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text>Carregando resultados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (erro) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <View style={styles.center}>
          <Text style={{ color: 'red' }}>{erro}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
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
        <Text style={styles.info}>Prêmio estimado: {resultado.acumuladaProxConcurso}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
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
    color: '#1976d2',
  },
  info: {
    fontSize: 16,
    marginBottom: 8,
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
});
