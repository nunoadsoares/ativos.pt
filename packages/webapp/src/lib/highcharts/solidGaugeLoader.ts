// C:\Users\nunos\Desktop\ativos.pt\packages\webapp\src\lib\highcharts\solidGaugeLoader.ts

import type HighchartsNS from 'highcharts';

// Evita corridas/HMR: um único promise global
let patched = false;
let loadPromise: Promise<void> | null = null;

// Ajuda a aceitar tanto default export como módulo direto (ESM/CJS)
function applyModule(mod: any, Highcharts: typeof HighchartsNS) {
  const fn = mod?.default ?? mod;
  if (typeof fn !== 'function') {
    throw new Error('Highcharts module inválido (sem função default).');
  }
  fn(Highcharts);
}

// Pequeno helper de retry exponencial (em caso de falhas esporádicas do bundler/HMR)
async function withRetry<T>(fn: () => Promise<T>, tries = 3, baseDelay = 120): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

/**
 * Carrega e aplica os módulos necessários ao SolidGauge, em ordem:
 *  - highcharts-more -> solid-gauge -> exporting
 * Só corre no cliente e apenas uma vez (mesmo com HMR).
 */
export async function ensureSolidGaugePatched(Highcharts: typeof HighchartsNS): Promise<void> {
  if (patched || typeof window === 'undefined') return;

  if (!loadPromise) {
    loadPromise = withRetry(async () => {
      // IMPORTANTE: ordem dos módulos
      const more = await import('highcharts/highcharts-more');
      applyModule(more, Highcharts);

      const solid = await import('highcharts/modules/solid-gauge');
      applyModule(solid, Highcharts);

      const exporting = await import('highcharts/modules/exporting');
      applyModule(exporting, Highcharts);

      patched = true;
    });
  }

  await loadPromise;
}

/**
 * Espera até que o container esteja realmente visível (largura > 0).
 * Útil para tabs/accordions/layouts que montam ocultos.
 */
export async function waitForVisibleWidth(el: HTMLElement, timeoutMs = 2000): Promise<void> {
  const start = performance.now();

  // 1) fast-path
  if (el.offsetWidth > 0) return;

  // 2) observar mudanças
  let resolve!: () => void;
  let timer: number | null = null;
  const done = () => { if (timer) window.clearTimeout(timer); resolve(); };

  const p = new Promise<void>(res => (resolve = res));

  const ro = new ResizeObserver(() => {
    if (el.offsetWidth > 0) done();
  });
  ro.observe(el);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting && el.offsetWidth > 0) done();
    }
  }, { threshold: 0.01 });
  io.observe(el);

  // 3) fallback por polling leve
  const poll = () => {
    if (el.offsetWidth > 0) return done();
    if (performance.now() - start > timeoutMs) return done();
    requestAnimationFrame(poll);
  };
  requestAnimationFrame(poll);

  // 4) timeout hard
  timer = window.setTimeout(done, timeoutMs);

  await p;
  ro.disconnect();
  io.disconnect();
}
