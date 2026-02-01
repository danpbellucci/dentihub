
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

// Define valores finais. Se as variáveis de ambiente não forem carregadas corretamente pelo Vite,
// usamos os valores fornecidos diretamente como fallback para garantir que a aplicação funcione.
export const SUPABASE_URL = rawUrl || 'https://cbsyffgbsymujxeodcqh.supabase.co';
export const SUPABASE_ANON_KEY = rawKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNic3lmZmdic3ltdWp4ZW9kY3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTY0MzgsImV4cCI6MjA4Mjc5MjQzOH0.OSjZrTYV87G8NhBzEhEVJO0BzLZsVF9F38HBNhcxK0M';

// Cria o cliente Supabase sem tipagem estrita para evitar erros de inferência 'never'
export const supabase = createClient(
  SUPABASE_URL, 
  SUPABASE_ANON_KEY
);