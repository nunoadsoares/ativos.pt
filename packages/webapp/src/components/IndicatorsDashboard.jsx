// packages/webapp/src/components/IndicatorsDashboard.jsx

import { createResource, For } from "solid-js";
import { getLatestIndicators } from "../data/db";

// Função para formatar a data para um formato mais legível
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('pt-PT', {
    month: 'long',
    year: 'numeric',
  });
}

// O nosso componente de dashboard
export default function IndicatorsDashboard() {
  // `createResource` é a forma do SolidJS de ir buscar dados.
  // Ele trata dos estados de loading e erro por nós.
  const [indicators] = createResource(getLatestIndicators);

  return (
    <div class="dashboard-container">
      <h2 class="dashboard-title">Pulso da Economia Portuguesa</h2>
      
      {/* O SolidJS vai mostrar isto enquanto os dados estão a ser carregados */}
      {indicators.loading && <p>A carregar indicadores...</p>}
      
      <div class="indicators-grid">
        <For each={indicators()} fallback={<p>Não foi possível carregar os dados.</p>}>
          {(indicator) => (
            <div class="indicator-card">
              <h3 class="indicator-label">{indicator.label}</h3>
              <p class="indicator-value">
                {indicator.value.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span class="indicator-unit">{indicator.unit === '%' ? '%' : ` ${indicator.unit}`}</span>
              </p>
              <p class="indicator-date">Ref: {formatDate(indicator.reference_date)}</p>
            </div>
          )}
        </For>
      </div>
      <p class="dashboard-source">Fonte: BPstat. Atualizado a {new Date(indicators()?.[0]?.updated_at).toLocaleDateString('pt-PT')}.</p>

      {/* Estilos básicos para o nosso dashboard. Podes mover isto para um ficheiro .css mais tarde */}
      <style>{`
        .dashboard-container { font-family: sans-serif; padding: 2rem; }
        .dashboard-title { margin-bottom: 1.5rem; }
        .indicators-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1rem; }
        .indicator-card { border: 1px solid #eee; border-radius: 8px; padding: 1rem; background-color: #f9f9f9; }
        .indicator-label { font-size: 1rem; margin: 0 0 0.5rem; color: #333; }
        .indicator-value { font-size: 2rem; font-weight: bold; margin: 0; color: #000; }
        .indicator-unit { font-size: 1rem; color: #666; }
        .indicator-date { font-size: 0.8rem; color: #999; margin-top: 1rem; }
        .dashboard-source { font-size: 0.75rem; color: #aaa; text-align: center; margin-top: 2rem; }
      `}</style>
    </div>
  );
}