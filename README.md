# Ativos.pt — Manual de Operação & Deploy

> **Objetivo**  
> Este README permite a qualquer pessoa operar, dar deploy, criar ETL (Python) que alimentam a base de dados SQLite, e integrar novos gráficos e APIs no site Ativos.pt com segurança e previsibilidade.

---

## Sumário

- Arquitetura
- Fluxo de Deploy (Visão Geral)
- Pré-requisitos
- Estrutura do Repositório
- Padrões de Git / Ignore Files
- Docker & Compose
- Nginx / TLS / Cloudflare
- CI/CD (GitHub Actions)
- Base de Dados (Schema & Contratos)
- Escrever Novos ETL (Python)
- Consumir Dados no Frontend / API
- Yahoo Finance em Produção
- Operações Comuns
- Diagnóstico & Resolução de Problemas
- Backups & Rollback
- Segurança & Performance
- Checklists
- Anexos: Snippets Úteis (explicados, sem código literal)

---

## Arquitetura

- Monorepo com duas áreas principais:
  - *packages/webapp* (Astro + Node 20): site e API HTTP. A webapp lê dados de uma SQLite e expõe endpoints REST.  
  - *packages/data-worker* (Python): scripts ETL que criam/atualizam a base de dados local antes do build.
- Base de dados central: ficheiro SQLite chamado *datahub.db*.
  - Em desenvolvimento local: vive em *packages/webapp/public/datahub.db*.  
  - Em produção: é gerado/atualizado primeiro no host (VPS) pelos ETL e só depois “empacotado” para o container da aplicação durante o build Docker.
- Deploy com Docker Compose:
  - *webapp-app*: Node (Astro adapter node) a servir API e HTML.
  - *webapp-web*: Nginx como reverse proxy HTTPS (front door).
  - *webapp-certbot*: renovação automática de certificados.
- Cloudflare à frente do Nginx (DNS/anti-DDoS/cache).  
- A API interna expõe dados em formato normalizado para os componentes do frontend.

---

## Fluxo de Deploy (Visão Geral)

1) Fazer push para a branch principal.  
2) CI conecta por SSH ao VPS, faz pull do repositório e ativa um venv para o *data-worker*.  
3) Executar o ETL principal (*update_all.py*) que constrói/atualiza a *datahub.db* no host (fora de containers).  
4) Construir as imagens com Docker (a imagem da webapp copia a *datahub.db* do host para dentro da imagem).  
5) Subir os serviços com Docker Compose, aguardar healthcheck.  
6) Executar smoke tests na API.  
7) Tráfego de produção já passa pelo Nginx para a nova versão.

---

## Pré-requisitos

- VPS (Linux) com Docker Engine e Docker Compose instalados.
- Acesso SSH com chave configurada.
- Node 20 LTS e Python 3.10+ instalados no VPS (para correr ETL no host).
- Certificados TLS via Let’s Encrypt (certbot) já configurados.
- Cloudflare configurado para o domínio e a apontar para o IP do VPS.

---

## Estrutura do Repositório

- *packages/webapp*: código da aplicação Astro (páginas, componentes, endpoints de API) e pasta *public* onde vive a SQLite durante o build.
- *packages/data-worker*: scripts Python que geram e preenchem a base. Tem um *requirements.txt* e um orquestrador *update_all.py*.
- Ficheiros de infra:
  - Dockerfile da webapp (build multi-stage).
  - docker-compose.yml com os serviços *web*, *app* e *certbot*.
  - Configuração Nginx em *packages/webapp/nginx/default.conf*.
  - Workflow de CI/CD (GitHub Actions) que orquestra as etapas por SSH.

---

## Padrões de Git / Ignore Files

- A base de dados e ficheiros temporários associados (WAL/SHM) **não** devem ser enviados para o Git.
- Garantir que no *.gitignore* existem entradas para:
  - *packages/webapp/public/datahub.db*
  - *packages/webapp/public/datahub.db-wal*
  - *packages/webapp/public/datahub.db-shm*
  - Qualquer dump ou backup local.
- Não versionar credenciais, .env e chaves.  
- Manter commits pequenos, com mensagens claras (ex.: *feat: novo ETL para X; fix: corrige mapeamento Y*).

---

## Docker & Compose

- Imagem da webapp:
  - Fase de build: instala dependências Node, copia o código e a pasta *public* (que inclui a *datahub.db* previamente gerada no host) e corre o build Astro.
  - Fase de runtime: copia *dist*, *node_modules*, *package.json* e a *public* com a *datahub.db* incorporada.
- O container *webapp-app* expõe a aplicação no porto interno 8080 e tem um healthcheck em */api/health*.
- O container *webapp-web* (Nginx) faz proxy para *app:8080* e termina TLS.  
- O container *webapp-certbot* gere renovação de certificados.  
- O Compose faz o rebuild da imagem em cada deploy (para incorporar a *datahub.db* final).

Importante: a *datahub.db* é gerada pelo ETL no host e só depois “copiada” para a imagem em build. Assim, a aplicação não depende de Python em runtime e não executa ETL dentro do container.

---

## Nginx / TLS / Cloudflare

- Nginx recebe todo o tráfego HTTP/HTTPS.  
  - HTTP 80 redireciona para HTTPS.  
  - HTTPS serve *www.ativos.pt* e encaminha tudo para *app:8080*.  
- Certificados TLS (Let’s Encrypt) já montados e renovados via *certbot*.
- Cloudflare em modo proxy para o domínio, fornecendo caching, mitigação, e DNS gerido.

Boas práticas:
- Evitar alterações frequentes à configuração Nginx em produção.  
- Opcional de hardening (recomendado): bloquear descarga de extensões como *.db, *.sqlite, *.sqlite3* ao nível do Nginx, para impedir servir ficheiros de base de dados por engano.

---

## CI/CD (GitHub Actions)

- Workflow dispara em push para *master*.  
- Por SSH no VPS:
  - Faz *git fetch/reset* para sincronizar.
  - Prepara venv do *data-worker* e instala dependências Python.
  - Executa *update_all.py* (o orquestrador) que:
    - Garante schema da base.
    - Recolhe dados (ex.: BPstat, inflação, HPI, quotas Euribor, câmbios, etc.).
    - Preenche *historical_series* e *key_indicators*.
  - Reconstrói containers com *docker compose up -d --build*.
  - Aguarda healthcheck da app.
  - Executa smoke tests na API (ex.: */api/health*, */api/data/exchangeRatesChart*).
- Sucesso do job confirma deploy ok.

---

## Base de Dados (Schema & Contratos)

Schema mínimo suportado pela aplicação:

- Tabela *historical_series*:
  - Campos: *series_key* (texto), *date* (YYYY-MM-DD), *value* (real).
  - Chave primária composta: *(series_key, date)*.
  - Datas em formato ISO (UTC, granularidade de dia).  
- Tabela *key_indicators*:
  - Campos: *indicator_key* (texto, chave primária), *label* (texto), *value* (texto), *reference_date* (YYYY-MM-DD ou ISO datetime), *updated_at* (ISO datetime), *unit* (texto, opcional).
  - Atenção: *value* pode conter número simples (serializado) ou JSON (para objetos mais complexos, como financials).  
- Regras:
  - Sem duplicados: usar UPSERT pelo par *(series_key, date)* ou pelo *indicator_key*.  
  - Arredondamento consistente: séries numéricas podem ser arredondadas no ETL (ex.: 4 casas).  
  - Journal mode WAL é recomendado durante escrita (mais robustez).
  - Nunca remover ou renomear colunas existentes sem migrar consumidores.

Contratos de leitura:

- A API de dados responde com envelopes previsíveis:
  - Indicador único: objeto com campos do indicador.
  - Série única: array de pontos com campos *date* e *value*.
  - Grupo de séries: objeto com várias chaves (aliases), cada uma com array de pontos.
- As páginas e componentes assumem estas formas na leitura.

---

## Escrever Novos ETL (Python)

Objetivo: adicionar fontes externas, normalizar e gravar na SQLite respeitando o schema e contratos.

Boas práticas:

1) Padrão de caminho da base  
   - Ler o path a partir de um módulo de configuração central (ex.: *config.DB_PATH*).  
   - Não codificar caminhos absolutos; o deploy usa o host para gerar a base.

2) Preparar ligação  
   - Abrir ligação SQLite com *isolation_level=None* (autocommit) quando fizer inserções em lote.  
   - Ativar *PRAGMA journal_mode = WAL* durante escrita.  
   - Fechar sempre a ligação no *finally*.

3) Normalização  
   - Datas em ISO *YYYY-MM-DD* (UTC).  
   - Arredondamentos e limpeza de NaN/valores nulos antes de gravar.  
   - Chaves estáveis e descritivas:
     - Séries: *domínio_origem_métrica_periodicidade* (ex.: *exchange_rate_eur_usd*; *euribor_rate_bportugal_12_meses_monthly*).  
     - Indicadores: *latest_*… ou uma chave clara por KPI.

4) Escrita  
   - Usar *INSERT OR REPLACE* para idempotência.  
   - Gravar séries em *historical_series* e KPIs em *key_indicators*.  
   - Para indicadores complexos, serializar JSON em *value* e registar *reference_date* e *updated_at*.

5) Orquestração  
   - Registar o novo ETL no *update_all.py* (ordem clara; falhas não devem bloquear o resto quando possível).  
   - Logs detalhados: contagens inseridas, faixas de datas, indicadores atualizados, URLs de origem.  
   - Validar com queries simples de contagem e amostras.

6) Performance  
   - Pedidos concorrentes (ex.: ThreadPool) quando a API origem o permite.  
   - Redução de cardinalidade (ex.: séries diárias → primeiro registo mensal) para gráficos mensais.

7) Reprodutibilidade & Segurança  
   - ETL não deve depender de variáveis de ambiente secretas persistentes; se necessário, usar secrets do host.  
   - Evitar side-effects fora do ficheiro da base.  
   - Atenção a termos e limites de APIs de origem.

---

## Consumir Dados no Frontend / API

Existem duas formas principais:

1) Acesso direto em SSR (no Astro):  
   - Utilizar utilitários internos (ex.: *getIndicator*, *getSeries*) que fazem *SELECT* na SQLite e devolvem objetos com o contrato certo para as páginas.

2) Via endpoints de API:  
   - Endpoint genérico: */api/data/[dataKey]*.  
     - Quando *dataKey* é uma série, devolve um array de pontos.  
     - Quando é um indicador, devolve um objeto do indicador.  
     - Quando é um grupo (mapeado via tabelas de alias internas), devolve objeto com várias séries ou indicadores.  
   - Batch: parâmetro *keys* aceita múltiplas chaves num único pedido, devolvendo um objeto com cada resultado.

Princípios:

- Os componentes que fazem fetch no client devem esperar sempre arrays de `{ date, value }` para séries.  
- Os componentes SSR podem usar *getIndicator* e *getSeries* diretamente para KPIs e gráficos estáticos.  
- Mantém consistente o nome das chaves para facilitar reuso e SEO (ex.: páginas que derivam títulos/descrições dos KPIs).

---

## Yahoo Finance em Produção

- A webapp usa *yahoo-finance2* para quotes, research, históricos, etc.
- Caching:
  - Em *key_indicators* (para objetos complexos) e em *historical_series* (para sparkline/históricos).  
  - Em produção, a base incorporada na imagem pode não ser escrita em todos os caminhos. O código está preparado para falhas de escrita do cache: a página continua a responder usando as respostas da API e ignora a tentativa de cache se não tiver permissões.
- Diferenças entre local e produção:
  - Em local, a base tende a estar em modo leitura/escrita, pelo que o cache persiste.  
  - Em produção, não depender do cache para funcionar; tratar cache como otimização oportunista.  
- Cuidados:
  - Respeitar limites do Yahoo (módulo já gere crumb/cookies e consent flows).  
  - Evitar aquisições redundantes (janelas de cache adequadas por tipo: quotes curtas; fundamentals longas; research intermédio).

---

## Operações Comuns

- Desenvolver localmente:
  - Executar ETL local para popular *packages/webapp/public/datahub.db*.  
  - *npm run dev* no webapp para pré-visualização; confirmar que páginas e API locais usam a base correta.  
- Preparar uma nova fonte de dados:
  - Criar ETL, ligar no orquestrador, gerar série/indicadores.  
  - Consumir na webapp via *getSeries*/*getIndicator* ou via endpoint de API.  
  - Criar componente/gráfico e página; validar com a API local.  
- Deploy manual (em caso de necessidade):
  - Repetir manualmente as etapas do CI no VPS: atualizar código, correr ETL, rebuild, subir Compose, verificar health e smoke tests.  
- Reindexar páginas estáticas:
  - Qualquer alteração no conteúdo SSR ou public gera novo *dist* no build e sobe com a imagem.

---

## Diagnóstico & Resolução de Problemas

Sintomas comuns e como inspecionar:

- Página sem dados ou gráfico vazio:
  - Verificar endpoint */api/data/...* correspondente: deve devolver estruturas esperadas (envelope com *ok* e *data*).  
  - Conferir se a série existe na base (contagem em *historical_series* e faixa de datas).  
  - Confirmar que as chaves pedidas pelo componente batem certo com as gravadas no ETL.

- Base de dados “parece vazia” após deploy:
  - Ver fluxo: ETL deve correr primeiro no host; só depois se constrói a imagem.  
  - Garantir que a *datahub.db* foi atualizada antes do *docker compose build/up*.  
  - Verificar timestamps e tamanho do ficheiro no host vs dentro do container.  
  - Integrity check e contagens (ver secção Backups & Rollback para checkpoints e consistência).

- Erros de escrita em produção:
  - “attempt to write a readonly database”: a aplicação ignora cache quando não consegue escrever; funcionalidade não deve quebrar.  
  - Se for necessário persistir cache, montar a base com permissões de escrita ou usar um caminho só para cache (fora da árvore estática da app).

- 301 inesperado via Nginx:
  - O *default.conf* redireciona e faz proxy; confirmar paths usados nos testes (em particular, quando testar localmente via *curl*, incluir Host e resolve para o loopback).  
  - Confirmar que endpoints são relativos a */api/*.

- Consent/crumb do Yahoo:
  - O módulo faz gestão automática; warnings podem aparecer nos logs mas a chamada prossegue.

---

## Backups & Rollback

- A *datahub.db* do host é a “fonte de verdade” antes de cada build.  
- Estratégia sugerida:
  - Backup diário da *datahub.db* (com timestamp) fora da árvore do repositório.  
  - Antes de copiar, forçar checkpoint (WAL) para garantir consistência.  
  - Manter retenção (ex.: 30 dias).  
- Rollback funcional:
  - Restaurar a *datahub.db* de backup no host.  
  - Reconstruir a imagem para incorporar a DB restaurada e subir novamente o Compose.  
  - Alternativamente, fazer rollback da imagem anterior se não houver alterações de schema.

---

## Segurança & Performance

- Nunca expor ficheiros *.db* publicamente.  
  - A *datahub.db* é usada internamente pela app — não deve ser servida como ativo estático.  
  - Recomendação de hardening Nginx: bloquear extensões *.db*, *.sqlite*, *.sqlite3*.  
- Cloudflare ativo no domínio (proteção DDoS e caching).  
- Healthcheck e smoke tests ativos no pipeline.  
- Logs monitorizados:
  - *webapp-app*: app Node (erros de API, Yahoo, acesso à DB).  
  - *webapp-web*: Nginx (requests externos, warnings).  
- Performance:
  - ETL faz downsampling quando apropriado (ex.: “primeiro dia de cada mês”) para reduzir payloads.  
  - No frontend, gráficos esperam arrays leves e a API suporta filtros (*since*, *limit*) quando necessário.

---

## Checklists

Antes do deploy:
- ETL atualizado e a escrever as chaves certas.  
- *datahub.db* no host com contagens e datas esperadas.  
- *.gitignore* garante que a DB não vai para o Git.  
- Workflow/SSH com acesso ao VPS a funcionar.

Depois do deploy:
- Health OK em */api/health*.  
- Endpoints chave da API a devolver dados (ex.: cambiais, HPI, quotas).  
- Páginas principais a mostrar KPIs e gráficos com valores atualizados.  
- Logs sem erros críticos.

Ao criar novo ETL:
- Chaves de série/indicador desenhadas e documentadas.  
- Normalização de datas e unidades.  
- UPSERT idempotente e WAL durante escrita.  
- Teste local da API e dos componentes consumidores.

---

## Anexos: Snippets Úteis (explicados, sem código literal)

- Consultas rápidas:
  - Contar linhas por série e listar faixas de datas por *series_key*.  
  - Confirmar existência de *historical_series* e *key_indicators* e correr *PRAGMA integrity_check*.
- Testes de API:
  - Fazer pedidos aos endpoints de dados e ao healthcheck, incluindo headers de Host quando testar via loopback.
- Troubleshooting de caching Yahoo:
  - Validar janelas de cache; em produção, tolerar falhas de escrita de cache (não são impeditivas).
- Boas práticas de componentes:
  - Esperar sempre arrays de `{ date, value }`.  
  - Evitar acoplamento a formatos de origem; confiar nos contratos da API interna.

---

> Nota final  
> O projeto foi desenhado para que a atualização de dados esteja desacoplada da aplicação. Em produção, o único caminho suportado e previsível é: ETL no host → base atualizada → build da imagem → servir app. Seguindo os contratos e as checklists acima, o deploy permanece determinístico, seguro e com diagnóstico simples.
