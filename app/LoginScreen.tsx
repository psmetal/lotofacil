
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { apiPost } from '../services/api';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function prepararCredenciais(email: string, senha: string) {
  return {
    email: email.trim().toLowerCase(),
    senha: senha.trim(),
  };
}

function validarCredenciais(email: string, senha: string, contexto: 'login' | 'cadastro') {
  if (!email || !senha) {
    return 'Preencha e-mail e senha.';
  }

  if (!EMAIL_REGEX.test(email)) {
    return 'Informe um e-mail valido.';
  }

  if (contexto === 'cadastro') {
    if (senha.length < 8) {
      return 'A senha deve ter no minimo 8 caracteres.';
    }

    const hasUpper = /[A-Z]/.test(senha);
    const hasLower = /[a-z]/.test(senha);
    const hasNumber = /\d/.test(senha);
    if (!hasUpper || !hasLower || !hasNumber) {
      return 'A senha deve conter maiuscula, minuscula e numero.';
    }
  }

  return null;
}

function formatarErroAuth(rawMessage: string, contexto: 'login' | 'cadastro') {
  const message = rawMessage.toLowerCase();

  if (message.includes('credenciais inválidas')) {
    return 'E-mail ou senha inválidos.';
  }

  if (message.includes('token não informado') || message.includes('token inválido') || message.includes('expirado')) {
    return 'Sua sessão expirou. Faça login novamente.';
  }

  if (message.includes('email e senha são obrigatórios')) {
    return 'Preencha e-mail e senha.';
  }

  if (contexto === 'cadastro' && message.includes('usuário já existe')) {
    return 'Este e-mail já está cadastrado.';
  }

  if (contexto === 'cadastro' && message.includes('ao menos 8 caracteres')) {
    return 'A senha deve ter 8+ caracteres, com maiúscula, minúscula e número.';
  }

  if (contexto === 'cadastro' && (message.includes('bad request') || message.includes('erro na requisição: 400'))) {
    return 'Dados de cadastro invalidos. Confira e-mail e senha.';
  }

  return rawMessage;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [modoRecuperacao, setModoRecuperacao] = useState(false);
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [codigoRecuperacao, setCodigoRecuperacao] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingRecuperacao, setLoadingRecuperacao] = useState(false);
  const [mensagemErro, setMensagemErro] = useState('');
  const router = useRouter();

  function limparRecuperacao() {
    setEmailRecuperacao('');
    setCodigoRecuperacao('');
    setNovaSenha('');
    setConfirmarNovaSenha('');
    setCodigoEnviado(false);
  }

  function abrirRecuperacao() {
    setMensagemErro('');
    setModoRecuperacao(true);
    setEmailRecuperacao(email.trim().toLowerCase());
  }

  function fecharRecuperacao() {
    setMensagemErro('');
    setModoRecuperacao(false);
    limparRecuperacao();
  }

  async function handleLogin() {
    setMensagemErro('');
    setLoading(true);
    const { email: emailPreparado, senha: senhaPreparada } = prepararCredenciais(email, senha);
    const erroValidacao = validarCredenciais(emailPreparado, senhaPreparada, 'login');
    if (erroValidacao) {
      setMensagemErro(erroValidacao);
      setLoading(false);
      return;
    }

    try {
      const data = await apiPost('/login', { email: emailPreparado, senha: senhaPreparada, password: senhaPreparada });
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        Alert.alert('Sucesso', 'Login realizado!');
        router.replace('/');
      } else {
        setMensagemErro('E-mail ou senha inválidos.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha na conexão com o servidor';
      setMensagemErro(formatarErroAuth(message, 'login'));
    }
    setLoading(false);
  }

  async function handleRegister() {
    setMensagemErro('');
    setLoading(true);
    const { email: emailPreparado, senha: senhaPreparada } = prepararCredenciais(email, senha);
    const erroValidacao = validarCredenciais(emailPreparado, senhaPreparada, 'cadastro');
    if (erroValidacao) {
      setMensagemErro(erroValidacao);
      setLoading(false);
      return;
    }

    try {
      const data = await apiPost('/register', { email: emailPreparado, senha: senhaPreparada, password: senhaPreparada });
      if (data.token) {
        await AsyncStorage.setItem('token', data.token);
        Alert.alert('Sucesso', 'Cadastro realizado!');
        router.replace('/');
      } else {
        Alert.alert('Sucesso', 'Cadastro realizado! Faça login.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha na conexão com o servidor';
      setMensagemErro(formatarErroAuth(message, 'cadastro'));
    }
    setLoading(false);
  }

  async function handleSolicitarCodigoRecuperacao() {
    setMensagemErro('');
    const emailPreparado = emailRecuperacao.trim().toLowerCase();

    if (!EMAIL_REGEX.test(emailPreparado)) {
      setMensagemErro('Informe um e-mail válido para recuperação.');
      return;
    }

    setLoadingRecuperacao(true);
    try {
      const data = await apiPost('/forgot-password', { email: emailPreparado });
      setCodigoEnviado(true);

      if (data?.resetToken) {
        setCodigoRecuperacao(String(data.resetToken));
        Alert.alert('Código gerado', `Ambiente de teste: código ${data.resetToken}`);
      } else {
        Alert.alert('Recuperação', data?.message || 'Se o e-mail existir, você receberá um código.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao solicitar código de recuperação.';
      setMensagemErro(message);
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  async function handleRedefinirSenha() {
    setMensagemErro('');
    const emailPreparado = emailRecuperacao.trim().toLowerCase();
    const token = codigoRecuperacao.trim();
    const novaSenhaPreparada = novaSenha.trim();

    if (!EMAIL_REGEX.test(emailPreparado)) {
      setMensagemErro('Informe um e-mail válido para recuperação.');
      return;
    }

    if (!token) {
      setMensagemErro('Informe o código de recuperação.');
      return;
    }

    if (novaSenhaPreparada !== confirmarNovaSenha.trim()) {
      setMensagemErro('A confirmação de senha não confere.');
      return;
    }

    const erroValidacao = validarCredenciais(emailPreparado, novaSenhaPreparada, 'cadastro');
    if (erroValidacao) {
      setMensagemErro(erroValidacao);
      return;
    }

    setLoadingRecuperacao(true);
    try {
      await apiPost('/reset-password', {
        token,
        newPassword: novaSenhaPreparada,
        senha: novaSenhaPreparada,
        password: novaSenhaPreparada,
      });

      Alert.alert('Sucesso', 'Senha redefinida com sucesso. Faça login com a nova senha.');
      setEmail(emailPreparado);
      setSenha('');
      fecharRecuperacao();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Falha ao redefinir senha.';
      setMensagemErro(message);
    } finally {
      setLoadingRecuperacao(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>{modoRecuperacao ? 'Recuperar senha' : 'Login'}</Text>

      {!modoRecuperacao ? (
        <>
          <TextInput
            style={[styles.input, mensagemErro ? styles.inputErro : null]}
            placeholder="E-mail"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              if (mensagemErro) {
                setMensagemErro('');
              }
            }}
          />
          <TextInput
            style={[styles.input, mensagemErro ? styles.inputErro : null]}
            placeholder="Senha"
            secureTextEntry={!mostrarSenha}
            value={senha}
            onChangeText={(value) => {
              setSenha(value);
              if (mensagemErro) {
                setMensagemErro('');
              }
            }}
          />
          <TouchableOpacity style={styles.toggleSenha} onPress={() => setMostrarSenha((valorAtual) => !valorAtual)}>
            <Text style={styles.toggleSenhaTexto}>{mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}</Text>
          </TouchableOpacity>
          {mensagemErro ? <Text style={styles.erroTexto}>{mensagemErro}</Text> : null}
          <TouchableOpacity style={styles.botao} onPress={handleLogin} disabled={loading}>
            <Text style={styles.botaoTexto}>{loading ? 'Entrando...' : 'Entrar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.botao, { backgroundColor: '#43a047' }]} onPress={handleRegister} disabled={loading}>
            <Text style={styles.botaoTexto}>{loading ? 'Cadastrando...' : 'Cadastrar'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkSecundario} onPress={abrirRecuperacao}>
            <Text style={styles.linkSecundarioTexto}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={[styles.input, mensagemErro ? styles.inputErro : null]}
            placeholder="E-mail cadastrado"
            autoCapitalize="none"
            keyboardType="email-address"
            value={emailRecuperacao}
            onChangeText={(value) => {
              setEmailRecuperacao(value);
              if (mensagemErro) {
                setMensagemErro('');
              }
            }}
          />

          {codigoEnviado ? (
            <>
              <TextInput
                style={[styles.input, mensagemErro ? styles.inputErro : null]}
                placeholder="Código recebido por e-mail"
                autoCapitalize="characters"
                value={codigoRecuperacao}
                onChangeText={(value) => {
                  setCodigoRecuperacao(value.toUpperCase());
                  if (mensagemErro) {
                    setMensagemErro('');
                  }
                }}
              />
              <TextInput
                style={[styles.input, mensagemErro ? styles.inputErro : null]}
                placeholder="Nova senha"
                secureTextEntry={!mostrarSenha}
                value={novaSenha}
                onChangeText={(value) => {
                  setNovaSenha(value);
                  if (mensagemErro) {
                    setMensagemErro('');
                  }
                }}
              />
              <TextInput
                style={[styles.input, mensagemErro ? styles.inputErro : null]}
                placeholder="Confirmar nova senha"
                secureTextEntry={!mostrarSenha}
                value={confirmarNovaSenha}
                onChangeText={(value) => {
                  setConfirmarNovaSenha(value);
                  if (mensagemErro) {
                    setMensagemErro('');
                  }
                }}
              />
              <TouchableOpacity style={styles.toggleSenha} onPress={() => setMostrarSenha((valorAtual) => !valorAtual)}>
                <Text style={styles.toggleSenhaTexto}>{mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}</Text>
              </TouchableOpacity>
            </>
          ) : null}

          {mensagemErro ? <Text style={styles.erroTexto}>{mensagemErro}</Text> : null}

          <TouchableOpacity style={styles.botao} onPress={handleSolicitarCodigoRecuperacao} disabled={loadingRecuperacao}>
            <Text style={styles.botaoTexto}>{loadingRecuperacao ? 'Enviando...' : codigoEnviado ? 'Reenviar código' : 'Enviar código'}</Text>
          </TouchableOpacity>

          {codigoEnviado ? (
            <TouchableOpacity style={[styles.botao, { backgroundColor: '#43a047' }]} onPress={handleRedefinirSenha} disabled={loadingRecuperacao}>
              <Text style={styles.botaoTexto}>{loadingRecuperacao ? 'Salvando...' : 'Redefinir senha'}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={styles.linkSecundario} onPress={fecharRecuperacao}>
            <Text style={styles.linkSecundarioTexto}>Voltar para login</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 32,
    color: '#1976d2',
  },
  input: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  inputErro: {
    borderColor: '#c62828',
  },
  toggleSenha: {
    width: '90%',
    alignItems: 'flex-end',
    marginTop: -8,
    marginBottom: 12,
  },
  toggleSenhaTexto: {
    color: '#1976d2',
    fontWeight: '600',
  },
  erroTexto: {
    width: '90%',
    color: '#c62828',
    marginBottom: 12,
    fontWeight: '600',
  },
  botao: {
    width: '90%',
    backgroundColor: '#1976d2',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  linkSecundario: {
    marginTop: 4,
    paddingVertical: 6,
  },
  linkSecundarioTexto: {
    color: '#1976d2',
    fontWeight: '700',
  },
});
