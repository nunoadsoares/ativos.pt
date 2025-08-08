# Guia Definitivo: Os 6 Passos para Criar Novas Ferramentas

Para adicionar qualquer novo indicador, gráfico ou ferramenta ao site, segue sempre estes 6 passos. Esta é a nossa arquitetura final e o nosso manual de instruções.

---

### Passo 1: Criar/Modificar o Script Python (O "Trabalhador")
Tudo começa aqui. Este script é responsável por ir buscar os dados à fonte original (API, etc.).

* **Objetivo:** Buscar os dados e guardá-los de forma estruturada na base de dados central `packages/webapp/public/datahub.db`.
* **Ações:**
    * Conectar-se ao `datahub.db`.
    * Usar `INSERT OR REPLACE INTO ...` para inserir ou atualizar os dados.
    * Definir chaves (`keys`) claras e consistentes:
        * Para **séries históricas (gráficos)**: Inserir na tabela `historical_series` com uma `series_key` no formato `tipo_fonte_nome_frequencia` (ex: `euribor_rate_bportugal_3m_monthly`).
        * Para o **valor mais recente (KPIs)**: Inserir na tabela `key_indicators` com uma `indicator_key` no formato `latest_tipo_fonte_nome` (ex: `latest_euribor_rate_3m`).

---

### Passo 2: Atualizar o Orquestrador Diário (`update_all.py`)
Depois de o teu script funcionar sozinho, tens de o adicionar ao processo automático de atualização completa.

* **Objetivo:** Garantir que o teu novo script é executado **diariamente** pelo cron do GitHub.
* **Ação:**
    * Abre o ficheiro `packages/data-worker/update_all.py`.
    * Adiciona o `import` da função `main` do teu novo script no topo.
    * Adiciona a chamada a essa função dentro da função `main()` do `update_all.py`, numa secção lógica (ex: `# A atualizar dados do BCE`).

---

### Passo 3: Atualizar o Semeador de Deploy (`run-seed.js`)
Este é o passo de segurança. Garante que as tuas novas páginas não dão erro após um deploy, antes de o cron diário correr.

* **Objetivo:** Popular a base de dados com o **mínimo de dados essenciais** para que as novas funcionalidades não quebrem ao serem colocadas online.
* **Ação:**
    * Abre o ficheiro `packages/webapp/scripts/run-seed.js`.
    * Importa e chama a mesma função do teu script Python que adicionaste ao `update_all.py`.
    * **Importante:** Este script corre no servidor sempre que fazes `push`. Ele garante que a estrutura da base de dados está pronta para o novo código.

---

### Passo 4: Atualizar o Mapa de Dados (`data-map.ts`)
Este passo "regista" os teus novos dados para que a API e os componentes interativos os possam encontrar.

* **Objetivo:** Mapear uma `dataKey` amigável para as chaves exatas que o script Python guardou na base de dados.
* **Ação:**
    * Abre o ficheiro `packages/webapp/src/lib/data-map.ts`.
    * Se for um gráfico com séries históricas: Adiciona uma nova entrada ao `CHART_SERIES_MAP`.
    * Se for um componente que precisa de vários KPIs de uma vez: Adiciona uma nova entrada ao `INDICATOR_GROUP_MAP`.

---

### Passo 5: Adaptar a Página Astro (`.astro`)
Este passo aplica-se a páginas principais de observatórios ou qualquer página que precise de mostrar dados gerados durante o build.

* **Objetivo:** Mostrar os dados mais recentes (KPIs, tabelas, texto dinâmico) na página.
* **Ações:**
    * No topo do ficheiro (na secção `---`), importa as funções `getIndicator` e `getSeries` de `~/lib/db`.
    * Usa `getIndicator('chave_exata_da_bd')` para ir buscar os KPIs de que precisas para os teus cartões de resumo, títulos, descrições de SEO, etc.

---

### Passo 6: Adaptar o Componente Interativo (`.tsx`)
Este passo aplica-se aos teus gráficos ou outros componentes React que são interativos no browser.

* **Objetivo:** Ir buscar os dados necessários para o gráfico funcionar de forma assíncrona.
* **Ações:**
    * Dentro de um `useEffect`, faz um único `fetch` ao nosso endpoint de API central, usando a `dataKey` que definiste no Passo 4.
    * **Exemplo:** `fetch('/api/data/meuNovoGraficoDeJuros')`.
    * Processa a resposta JSON para alimentar as `series` do teu gráfico.