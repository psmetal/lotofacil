import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

// Serviço centralizado para chamadas à API.
// Se estiver usando celular físico, defina EXPO_PUBLIC_API_URL com o IP da sua máquina.
const DEFAULT_PORT = '3000';
const REQUEST_TIMEOUT_MS = 12000;

function getHostFromScriptURL() {
  const scriptURL = NativeModules?.SourceCode?.scriptURL;
  if (!scriptURL) {
    return null;
  }

  try {
    const parsed = new URL(scriptURL);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

function getExpoHost() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri ||
    null;

  if (!hostUri) {
    return null;
  }

  return hostUri.split(':')[0];
}

const LOCAL_HOST = Platform.select({
  android: '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

const DETECTED_HOST = getHostFromScriptURL() || getExpoHost();

function normalizeEndpoint(endpoint) {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

function buildBaseUrl(host) {
  return `http://${host}:${DEFAULT_PORT}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getCandidateBaseUrls() {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || null;
  const detected = DETECTED_HOST ? buildBaseUrl(DETECTED_HOST) : null;
  const local = LOCAL_HOST ? buildBaseUrl(LOCAL_HOST) : null;

  return unique([
    envUrl,
    detected,
    local,
    buildBaseUrl('127.0.0.1'),
    buildBaseUrl('localhost'),
    buildBaseUrl('10.0.2.2'),
  ]);
}

export let BASE_URL = getCandidateBaseUrls()[0] || buildBaseUrl('localhost');

function buildUrl(baseUrl, endpoint) {
  return `${baseUrl}${normalizeEndpoint(endpoint)}`;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function isConnectivityError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = (error.message || '').toLowerCase();
  return (
    error.name === 'AbortError' ||
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror')
  );
}

async function requestWithFallback(endpoint, options = {}) {
  const candidates = unique([BASE_URL, ...getCandidateBaseUrls()]);
  const tried = [];
  let lastError = null;

  for (const baseUrl of candidates) {
    const url = buildUrl(baseUrl, endpoint);
    tried.push(baseUrl);

    try {
      const response = await fetchWithTimeout(url, options);
      BASE_URL = baseUrl;
      return response;
    } catch (error) {
      if (isConnectivityError(error)) {
        lastError = error;
        continue;
      }

      throw error;
    }
  }

  const extra = lastError instanceof Error ? ` Detalhe: ${lastError.message}` : '';
  throw new Error(
    `Falha ao conectar ao servidor. Hosts testados: ${tried.join(', ')}.${extra} Verifique backend ativo, IP e firewall.`
  );
}

export async function apiGet(endpoint) {
  const response = await requestWithFallback(endpoint);
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data?.message || 'Erro na requisição: ' + response.status);
  }
  return data;
}

export async function apiGetAuth(endpoint, token) {
  const response = await requestWithFallback(endpoint, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data?.message || 'Erro na requisição: ' + response.status);
  }
  return data;
}

export async function apiPost(endpoint, data) {
  const response = await requestWithFallback(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const responseData = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(responseData?.message || 'Erro na requisição: ' + response.status);
  }
  return responseData;
}

export async function apiPatch(endpoint, data, token) {
  const response = await requestWithFallback(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  const responseData = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(responseData?.message || 'Erro na requisição: ' + response.status);
  }
  return responseData;
}
