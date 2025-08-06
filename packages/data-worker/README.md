# Arquitetura de Dados do Projeto ativos.pt

## 1. Visão Geral

Este documento descreve a arquitetura de dados centralizada do projeto **ativos.pt**. O objetivo é ter um fluxo de dados robusto, escalável e de fácil manutenção, seguindo o princípio da **"única fonte de verdade" (Single Source of Truth)**.

A arquitetura assenta em três pilares:

- **Data Ingestion (Python):** Scripts Python (data-workers) são responsáveis por buscar dados de fontes externas (APIs, scraping) e guardá-los de forma estruturada.
- **Data Storage (SQLite):** Uma única base de dados SQLite (`database.db`) armazena todos os dados recolhidos.
- **Data Serving (Astro API):** Um único endpoint de API dinâmico em Astro serve os dados da base de dados para os componentes do frontend.

---

## 2. Estrutura de Ficheiros Relevante

```plaintext
ativos.pt/
├── packages/
│   ├── data-worker/
│   │   └── scripts/
│   │       └── tema/
│   │           └── o_meu_script.py         # <- RESPONSABILIDADE 1
│   │
│   └── webapp/
│       ├── public/
│       │   └── database.db                 # <- A NOSSA BASE DE DADOS
│       │
│       └── src/
│           ├── components/
│           │   └── OMeuComponente.tsx     # <- RESPONSABILIDADE 4
│           │
│           ├── lib/
│           │   ├── db.ts                  # (Helper para aceder à BD)
│           │   └── data-map.ts            # <- RESPONSABILIDADE 3
│           │
│           └── pages/
│               └── api/
│                   └── data/
│                       └── [dataKey].ts   # <- RESPONSABILIDADE 2
│
└── README.md  # (Este ficheiro)
```

---

## 3. Fluxo de Trabalho e Responsabilidades

### 🟦 Responsabilidade 1: Adaptar o Script Python (`o_meu_script.py`)

O objetivo é modificar um script Python para que, em vez de criar ficheiros `.json` ou `.csv`, insira os dados diretamente na `database.db`.

#### Regras:

- **Conexão:** O script deve conectar-se a `packages/webapp/public/database.db`.
- **Tabelas:** Deve usar as tabelas predefinidas:
  - `key_indicators`: Para valores únicos e mais recentes (ex: a cotação de hoje, o último valor da inflação).
  - `historical_series`: Para séries temporais completas (ex: gráfico de cotações dos últimos 10 anos).
  - Outras tabelas conforme necessário.
- **Chaves (IDs):** É crucial usar chaves de identificação consistentes e previsíveis:
  - `indicator_key`: `tipo_fonte_nome` (ex: `inflation_ine_ipc_portugal`)
  - `series_key`: `tipo_fonte_nome_historico` (ex: `exchange_rate_bportugal_eur_usd_monthly`)
- **Operação:** Usar `INSERT OR REPLACE` (ou `ON CONFLICT DO UPDATE` em Postgres).
- **Debug:** O script deve imprimir mensagens de sucesso com o número de linhas inseridas/atualizadas.

---

### 🟦 Responsabilidade 2: Garantir o Endpoint da API (`[dataKey].ts`)

Este ficheiro é o **servidor de dados central**. Ele recebe um pedido com uma `dataKey` (ex: `exchangeRatesChart`) e devolve os dados correspondentes da base de dados.  
A lógica é genérica e normalmente não precisará de ser modificada.

---

### 🟦 Responsabilidade 3: Mapear os Dados (`data-map.ts`)

Este ficheiro é o coração da lógica de negócio. Ele mapeia uma `dataKey` (usada pelo frontend) para as chaves específicas (`series_key`) que estão na base de dados.

#### Regras:

- Quando um novo gráfico ou componente precisa de um conjunto de dados, uma nova entrada é adicionada a este ficheiro.
- O `CHART_SERIES_MAP` é usado para agrupar múltiplas `series_key` que um único gráfico precisa.

#### Exemplo (`src/lib/data-map.ts`):

```ts
export const CHART_SERIES_MAP = {
  exchangeRatesChart: [
    'exchange_rate_eur_usd',
    'exchange_rate_eur_gbp'
  ],
  euriborRatesChart: [
    'euribor_rate_3m',
    'euribor_rate_6m'
  ]
};
```

---

### 🟦 Responsabilidade 4: Adaptar o Componente (`OMeuComponente.tsx`)

O objetivo é modificar um componente React/Astro para que, em vez de ler um ficheiro, peça os dados ao nosso endpoint de API central.

#### Regras:

- **Remover importações de JSON/CSV.**
- **Fetch da API:** Usar `useEffect` com `fetch('/api/data/[dataKey]')`.
- **Exemplo:**  
  ```ts
  fetch('/api/data/exchangeRatesChart')
    .then(res => res.json())
    .then(setDados);
  ```
- O resto do código do componente processa a resposta JSON normalmente.

---

## 4. Instruções para o LLM

Sempre que for pedido integrar um novo conjunto de dados, a sequência correta é:

### Inputs Recebidos:

- Código de um script Python (`o_meu_script.py`).
- Código de um componente do frontend (`OMeuComponente.tsx`).

### Saídas a Gerar:

1. **Código Python Modificado:**  
   - Guardar os dados diretamente na `database.db`  
   - Definir `indicator_key` ou `series_key` previsível e coerente

2. **Atualização do `data-map.ts`:**  
   - Criar nova entrada no `CHART_SERIES_MAP`  
   - Associar a nova `dataKey` às `series_key` inseridas no passo 1

3. **Componente Modificado:**  
   - Trocar import estático por `fetch('/api/data/oMeuNovoGrafico')`  
   - Usar a mesma `dataKey` do passo anterior

### ⚠️ Importante

O LLM deve agir **de forma sequencial**, garantindo que:
- As chaves criadas no script Python (step 1)  
- São as mesmas usadas no mapa (`data-map.ts`, step 2)  
- E essas são exatamente as mesmas que o componente vai pedir no `fetch()` (step 3)
