
import { createClient } from '@supabase/supabase-js';
// import { Database } from '../types'; // Removed to fix strict type inference issues

// Função auxiliar para ler variáveis de ambiente de forma segura
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    // @ts-ignore
    return import.meta.env[key] || '';
  }
  // Fallback para process.env se necessário (ex: alguns ambientes de teste)
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env) {
    // @ts-ignore
    return process.env[key] || '';
  }
  return '';
};

// Tenta ler as variáveis do ambiente
const rawUrl = getEnv('VITE_SUPABASE_URL');
const rawKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Define valores finais. 
// IMPORTANTE: Em produção, estas variáveis DEVEM estar configuradas no ambiente.
export const SUPABASE_URL = rawUrl;
export const SUPABASE_ANON_KEY = rawKey;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Aviso: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configuradas.");
}

// Cria o cliente Supabase sem tipagem estrita para evitar erros de inferência 'never'
export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_ANON_KEY
);