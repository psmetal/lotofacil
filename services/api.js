// Serviço centralizado para chamadas à API
// Altere endpoints conforme necessário

const BASE_URL = 'http://192.168.1.100:3000'; // Altere para o IP da sua máquina se necessário

export async function apiGet(endpoint) {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error('Erro na requisição: ' + response.status);
  }
  return response.json();
}

export async function apiPost(endpoint, data) {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Erro na requisição: ' + response.status);
  }
  return response.json();
}
