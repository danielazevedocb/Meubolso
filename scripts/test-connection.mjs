#!/usr/bin/env node
/**
 * Teste de conexão com o Supabase do projeto.
 *
 * Lê as variáveis públicas do `.env` na raiz (sem dependências externas),
 * valida que existem e faz um ping no endpoint de health do GoTrue
 * (`/auth/v1/health`) usando a chave anon. Reporta status HTTP + latência.
 *
 * Uso: `npm run test:connection`
 * Exit code 0 = OK; ≠ 0 = falha (env ausente ou rede/serviço indisponível).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENV_PATH = resolve(ROOT, '.env');
const HEALTH_TIMEOUT_MS = 10_000;

/** Parser mínimo de `.env`: ignora comentários/linhas vazias, sem expandir variáveis. */
function parseEnvFile(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return {};
  }
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Sinaliza falha sem `process.exit()` abrupto (evita assertion do libuv no Windows com sockets abertos). */
function fail(message) {
  console.error(`✖ ${message}`);
  process.exitCode = 1;
}

async function main() {
  // process.env tem prioridade (CI/EAS); cai para o `.env` local.
  const fromFile = parseEnvFile(ENV_PATH);
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || fromFile.EXPO_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    fromFile.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim();

  if (!url) {
    return fail('EXPO_PUBLIC_SUPABASE_URL ausente. Defina no `.env` da raiz (veja `.env.example`).');
  }
  if (!anonKey) {
    return fail('EXPO_PUBLIC_SUPABASE_ANON_KEY ausente. Defina no `.env` da raiz (veja `.env.example`).');
  }
  if (!/^https?:\/\//.test(url)) {
    return fail(`EXPO_PUBLIC_SUPABASE_URL inválida: "${url}". Esperado algo como https://SEU_PROJETO.supabase.co`);
  }

  const healthUrl = `${url.replace(/\/$/, '')}/auth/v1/health`;
  console.log(`→ Testando conexão: ${healthUrl}`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const res = await fetch(healthUrl, {
      headers: { apikey: anonKey },
      signal: controller.signal,
    });
    await res.text(); // drena o corpo para liberar o socket
    const elapsedMs = Date.now() - startedAt;

    if (!res.ok) {
      return fail(`Servidor respondeu ${res.status} ${res.statusText} (${elapsedMs}ms). Verifique URL e chave anon.`);
    }

    console.log(`✓ OK — HTTP ${res.status} em ${elapsedMs}ms. Supabase acessível.`);
  } catch (error) {
    const elapsedMs = Date.now() - startedAt;
    if (error?.name === 'AbortError') {
      return fail(`Timeout após ${HEALTH_TIMEOUT_MS}ms. Sem resposta do Supabase — verifique rede e URL.`);
    }
    return fail(`Falha de rede após ${elapsedMs}ms: ${error?.message ?? error}`);
  } finally {
    clearTimeout(timer);
  }
}

void main();
