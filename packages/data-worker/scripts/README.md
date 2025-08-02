# Sistema de Atualização Automática de Dados (`data-worker`)

Este diretório contém toda a lógica para a recolha, processamento e atualização automática dos dados económicos e financeiros apresentados no site `ativos.pt`.

## Filosofia

O `data-worker` opera sob um princípio de **CI/CD para Dados**. A sua função é executar scripts (scrapers) de forma agendada para ir buscar os dados mais recentes a fontes oficiais (como o BPstat), processá-los para um formato limpo e consistente (JSON ou CSV), e fazer o *commit* desses ficheiros de dados diretamente no repositório.

A webapp em Astro é depois construída usando estes ficheiros de dados estáticos, garantindo um site extremamente rápido e resiliente.

## O Encadeamento Automático

O processo é 100% automático e segue uma sequência bem definida, orquestrada pelo GitHub Actions.

```plaintext
(Todos os dias às 07:00 UTC / 08:00 em Portugal)
               |
               V
[ GitHub Actions: .github/workflows/update-data.yml ]
(Inicia uma máquina virtual, instala Python e as dependências)
               |
               V
[ Executa o orquestrador: `python packages/data-worker/update_all.py` ]
               |
               +---> [ Executa script quotas Euribor ] -> .../public/data/euribor_..._share.csv
               |
               +---> [ Executa script taxas Euribor ] -> .../public/data/euribor_rates_monthly.json
               |
               +---> [ Executa script preços da habitação ] -> .../public/data/house_price_...
               |
               +---> [ ... outros scripts ... ]
               |
               V
[ O workflow verifica se os ficheiros de dados foram alterados ]
               |
               +---- (Se não houver alterações) ----> [ Processo termina com sucesso ]
               |
               V
      (Se houver alterações)
               |
[ "Ativos.pt Data Bot" faz git commit & git push dos novos dados ]
               |
               V
[ O push aciona o deploy do site: .github/workflows/deploy.yml ]
               |
               V
[ O site `ativos.pt` é reconstruído com os dados novos e publicado ]
```

## Estrutura de Ficheiros

-   **`update_all.py`**: O ficheiro principal que orquestra a execução de todos os scripts. É o "maestro".
-   **`apibp/`**: Contém a lógica de base para interagir com a API do BPstat, incluindo o `explorador.py`.
-   **`scripts/`**: O coração do worker. Contém os scripts individuais, organizados por categoria (euribor, preco_casas, etc.), cada um responsável por buscar um conjunto de dados específico.
-   **`requirements.txt`**: Lista as dependências Python necessárias para executar todos os scripts.

## Trabalhar com a API do BPstat: O Método Correto

A interação com a API do BPstat pode não ser intuitiva. A experiência demonstrou que a abordagem mais robusta para obter uma série de dados específica (como uma taxa Euribor) não é tentar adivinhar a combinação de `domain_id` e `dataset_id`, pois isso pode levar a erros `404 Not Found` mesmo com URLs que parecem corretos.

A documentação oficial e a prática revelaram um **fluxo de trabalho em dois passos** que funciona de forma consistente:

1.  **Primeiro, obter os metadados da Série**: O ponto de partida é sempre o `series_id` da informação que se pretende. A primeira chamada à API é feita ao endpoint `/series/` para obter os metadados dessa série.
    -   `GET /v1/series/?series_ids={O_TEU_SERIES_ID}`

2.  **Segundo, obter os dados com os IDs corretos**: A resposta do passo anterior contém o `domain_id` e o `dataset_id` **oficiais e corretos** para aquela série. Só então é que se faz a segunda chamada ao endpoint de dados, usando esta informação.
    -   `GET /v1/domains/{domain_id}/datasets/{dataset_id}/?series_ids={O_TEU_SERIES_ID}`

Esta metodologia garante que estamos sempre a usar a combinação de IDs que a API espera, evitando os "datasets fantasma". O script `scripts/euribor/get_euribor_rates.py` é um exemplo prático desta implementação.

## Como Adicionar um Novo Scraper de Dados

Para adicionar uma nova fonte de dados, o processo é simples e segue a arquitetura existente:

1.  **Explorar a Fonte**: Se for do BPstat, a primeira tarefa é encontrar o `series_id` correto. Isto pode ser feito navegando no site do BPstat até à página da série desejada e extraindo o ID do URL.
2.  **Criar o Script Individual**: Cria um novo ficheiro `.py` dentro de uma subpasta apropriada em `scripts/`. Este script deve implementar o fluxo de dois passos descrito acima.
    -   O script deve conter uma função principal (ex: `main()` ou `fetch_data()`).
    -   Deve guardar o resultado final na pasta `packages/webapp/public/data/`.
3.  **Integrar no Orquestrador**: Abre o `update_all.py`:
    -   Importa a função principal do teu novo script (ex: `from scripts.nova_categoria.get_novos_dados import main as novos_dados`).
    -   Adiciona a chamada da função dentro da função `main()` do `update_all.py`.
4.  **Testar Localmente**: Executa `python update_all.py` a partir da raiz do `data-worker` para garantir que tudo corre sem erros.
5.  **Fazer Commit**: Adiciona o novo script e as alterações ao `update_all.py` ao Git. O sistema de automação tratará do resto na próxima execução agendada.

## Execução Local

Para testar ou forçar uma atualização manual de todos os dados no teu ambiente local:

```bash
# Navega para a pasta do worker
cd packages/data-worker

# (Recomendado) Cria e ativa um ambiente virtual
python -m venv .venv
source .venv/bin/activate # ou .\.venv\Scripts\activate em Windows

# Instala as dependências
pip install -r requirements.txt

# Executa o orquestrador
python update_all.py
```