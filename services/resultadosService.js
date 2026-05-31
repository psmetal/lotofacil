import { apiGet } from '../services/api';

export async function buscarResultados() {
  // Exemplo de endpoint, ajuste conforme seu back-end
  return apiGet('/resultados');
}
