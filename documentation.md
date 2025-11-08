**Documentação Técnica — Backend SSP: Registros e BO**

- Objetivo: disponibilizar uma API para transcrever áudio com IA, registrar Boletins de Ocorrência (B.O.), listar/filtrar registros, atualizar com auditoria, excluir com auditoria, e sincronizar dados coletados offline.
- Público: trabalho de conclusão de curso (TCC) com foco no backend, arquitetura, fluxos, integrações externas e persistência.

**Stack e Runtime**
- Runtime: `Node.js >= 20` com módulos ES (`type: module`).
- Linguagem: `TypeScript` (`strict`, `moduleResolution: node16`).
- Framework web: `Fastify` com `fastify-type-provider-zod` para validação tipada.
- ORM: `Drizzle ORM` com driver `postgres` (`postgres-js`).
- Banco de dados: `PostgreSQL` (Docker `bitnami/postgresql:13.16.0`).
- Testes: `Vitest` com ambiente Node e `setupFiles` para preparar o banco.
- Ferramentas de IA: `@google/generative-ai` (Gemini) e `@ai-sdk/google` + `ai` (streamObject).
- E-mail: `Resend` para envio de confirmação com PDF anexado.

**Arquitetura de Pastas**
- `src/server.ts`: inicializa o Fastify, configura CORS, serializers/validators com Zod e registra rotas.
- `src/http/routes/`: endpoints HTTP agrupados por domínio.
- `src/db/connection.ts`: instancia `postgres` e `drizzle` com `schema` e `snake_case`.
- `src/db/schema/`: definição das tabelas (`register_bo`, `bo_audit_log`) e export do `schema`.
- `src/db/migrations/`: migrações geradas pelo Drizzle Kit e metadados (`meta/`).
- `src/db/seed.ts`: povoamento do banco com dados realistas via `drizzle-seed`.
- `src/services/`: serviços de infra (PDF, e-mail, validação de policial).
- `tests/`: testes de rotas e serviços, mais `tests/setup-db.ts` para preparar o ambiente.
- `docker-compose.yml`: serviço de Postgres com volume persistente.
- `drizzle.config.ts`: configuração do Drizzle (dialeto, schema, output, credenciais).
- `.env.example` e `.env.test`: variáveis de ambiente de produção e testes.

**Configuração e Ambiente**
- Variáveis (validadas em `src/env.ts` com Zod):
  - `DATABASE_URL`: URL Postgres (ex.: `postgresql://docker:docker@localhost:5432/ssp_bo`).
  - `GEMINI_API_KEY`: chave para modelos Gemini (Google AI).
  - `RESEND_API_KEY`: chave do serviço de e-mail Resend.
  - `EMAIL_FROM`: remetente do e-mail (default `boletim@seusistema.com`).
- Exemplos:
  - `.env.example` contém todas as chaves necessárias e valores de exemplo.
  - `.env.test` aponta para `ssp_bo_test` e usa chaves “dummy” de teste.

**Docker e Banco**
- `docker-compose.yml`:
  - Serviço `transcription` com `bitnami/postgresql:13.16.0`.
  - Usuário/senha: `docker/docker`, DB: `ssp_bo`, porta `5432` mapeada.
  - Volume: `./docker/postgres_data:/bitnami/postgresql` para persistência.
- Execução:
  - Subir DB: `docker-compose up -d`.
  - Scripts DB: `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`.
- Extensões:
  - Testes habilitam `unaccent` (ver `tests/setup-db.ts`). Recomenda-se criar a extensão também no ambiente de desenvolvimento/produção para buscas acento-insensitivas.

**ORM e Migrações (Drizzle)**
- `drizzle.config.ts`:
  - `dialect: 'postgresql'`, `casing: 'snake_case'`, `schema: './src/db/schema/**.ts'`, `out: './src/db/migrations'`.
  - `dbCredentials.url` puxado de `env.DATABASE_URL` (validado por Zod).
- Evolução do schema (principais migrações):
  - `0000_gorgeous_star_brand.sql`: cria `register_bo` com `id`, `transcription`, `created_at`.
  - `0001_robust_magdalene.sql`: adiciona campos de ocorrência e comunicante (data/hora, local, tipo, nome, cpf/rg, data de nascimento, gênero, nacionalidade, estado civil, profissão, endereço, telefone/celular, e-mail, relação com o fato).
  - `0002_odd_old_lace.sql`: altera `date_of_birth` para `date` (string YYYY-MM-DD no Drizzle, armazenada como `date` no Postgres).
  - `0003_brave_karma.sql`: suporte a sincronização offline (`local_id` único, `collected_at`, `received_at` default now, `sync_status`).
  - `0004_cold_baron_zemo.sql`: cria `bo_audit_log` para auditoria de update/delete.

**Servidor e Middleware**
- `src/server.ts`:
  - Inicia `Fastify` com `logger: true` e `bodyLimit: 100MB`.
  - Configura `serializerCompiler` e `validatorCompiler` (Zod).
  - Registra `@fastify/cors`.
  - Registra rotas: `transcriptionRoute`, `registerBoRoute`, `autofillBoRoute`, `syncBoletinsRoute`.
  - Porta padrão: `3333` (`http://localhost:3333`).

**Endpoints**
- `POST /transcribe`
  - Entrada: `multipart/form-data` com arquivo de áudio (campo padrão do plugin `@fastify/multipart`).
  - Processo: utiliza `@google/generative-ai` (`GoogleGenerativeAI`) com modelo `gemini-2.5-flash` para transcrição.
  - Prompt: pede transcrição em PT-BR com precisão e sem “ruídos de fundo”.
  - Resposta: `{ text: string }` com transcrição.
  - Erros: 400 se arquivo ausente; 500 em falha de transcrição (log via `app.log`).

- `POST /autofill-bo`
  - Entrada: body JSON `{ userInput: string }` com relato livre do usuário.
  - Processo: `ai.streamObject` com `@ai-sdk/google` (`createGoogleGenerativeAI`) e modelo `models/gemini-2.5-flash` para extrair campos estruturados segundo `boSchema` (Zod com descrições).
  - Saída: objeto JSON com campos do B.O. (preenchidos somente quando detectados; não inventa dados conforme prompt).
  - Erros: 500 se a IA retornar texto não JSON parseável (inclui `raw` para depuração).

- `POST /register-bo`
  - Validação: `zod` para todos os campos; aceita `date_of_birth` como `YYYY-MM-DD`, ISO datetime, ou `""` para limpar; `email` pode ser e-mail válido ou `""` para remover.
  - Processo:
    - Normaliza `date_of_birth` para `YYYY-MM-DD` quando necessário.
    - Insere registro na `register_bo` e retorna `id`.
    - Gera PDF (serviço `generatePdf`) com dados essenciais e opcionais.
    - Envia e-mail de confirmação (serviço `sendBoConfirmationEmail`) com PDF anexado se `email` informado.
  - Resposta: `201 { id: string }`.
  - Erros: 500 em falha interna; falha de e-mail não aborta o registro (é apenas logada).

- `GET /register-bo`
  - Query: `page` (default 1), `searchTerm` (opcional), `typeFilter` (opcional; `all` ignora filtro).
  - Filtro:
    - Busca acento-insensitiva com `unaccent` e case-insensitive (`ILIKE`) em `id`, `full_name`, `place_of_the_fact`, `type_of_occurrence`.
    - Filtra por `type_of_occurrence` quando `typeFilter` definido e diferente de `all`.
  - Paginação: `limit = 10`, `offset = (page - 1) * 10`; retorna `{ data, total, page, totalPages }` ordenado por `created_at` desc.
  - Erros: 500 com logging detalhado.

- `GET /register-bo/:id`
  - Validação: `id` UUID.
  - Processo: busca por `id` e retorna o registro completo.
  - Erros: 404 se não encontrado; 500 em falha.

- `PUT /register-bo/:id`
  - Requer: `police_identifier` (string não vazia) para autorização de edição.
  - Validação: mesma semântica de `date_of_birth` e `email` do `POST`; aceita `date_and_time_of_event` como ISO ou `""`.
  - Autorização: `isValidPoliceIdentifier` (mock) valida identificadores conhecidos.
  - Regras de atualização:
    - Converte `""` em `null` somente para campos opcionais; ignora `""` nos campos obrigatórios (`place_of_the_fact`, `type_of_occurrence`, `full_name`, `relationship_with_the_fact`).
    - Normaliza `date_of_birth` e `date_and_time_of_event` conforme necessário.
  - Auditoria (`bo_audit_log`):
    - Registra `action = 'update'`, `police_identifier`, `changedKeys`, e `diff { from, to }` por campo alterado, além de `ip`.
    - Se nenhuma alteração foi aplicada, cria log com `changedKeys: []` e retorna estado atual.
  - Resposta: 200 com registro atualizado.
  - Erros: 403 se identificador inválido; 404 se `id` inexistente; 500 em falha.

- `DELETE /register-bo/:id`
  - Requer: `police_identifier` para autorização.
  - Processo:
    - Verifica existência e autorização.
    - Exclui registro em `register_bo`.
    - Auditoria (`bo_audit_log`): grava `action = 'delete'`, `snapshot` com campos-chave (id, nome, tipo, data de criação) e `ip`.
  - Resposta: 204 sem body.
  - Erros: 403 se não autorizado; 404 se inexistente; 500 em falha.

- `POST /sync/boletins`
  - Autenticação: header `Authorization` obrigatório (placeholder; JWT pode ser adicionado futuramente).
  - Entrada: array de objetos com os mesmos campos do `POST /register-bo`, acrescido de `localId` (único) e `collected_at`.
  - Processo:
    - Se já existe `localId`, retorna mapeamento `{ localId, serverId }` sem inserir novamente.
    - Sanitiza strings vazias em campos opcionais; normaliza datas.
    - Insere com campos de sync (`localId`, `collectedAt`, `receivedAt`, `syncStatus`).
    - Opcionalmente envia e-mail com PDF (se `email` válido presente).
  - Saída: `{ synced: Array<{ localId, serverId }>, failed: Array<{ localId, error }> }`.

**Dados e Tabelas**
- `register_bo` (registro principal de B.O.):
  - `id` (`uuid`, PK).
  - `date_and_time_of_event` (`timestamp`, obrigatório).
  - `place_of_the_fact` (`text`, obrigatório).
  - `type_of_occurrence` (`text`, obrigatório).
  - `full_name` (`text`, obrigatório).
  - `cpf_or_rg` (`text`, opcional).
  - `date_of_birth` (`date`, opcional; formato `YYYY-MM-DD`).
  - `gender` (`text`, opcional).
  - `nationality` (`text`, opcional).
  - `marital_status` (`text`, opcional).
  - `profession` (`text`, opcional).
  - `full_address` (`text`, opcional).
  - `phone_or_cell_phone` (`text`, opcional).
  - `email` (`text`, opcional; validado no payload).
  - `relationship_with_the_fact` (`text`, obrigatório).
  - `transcription` (`text`, opcional).
  - `localId` (`text`, único; identificador local offline).
  - `collectedAt` (`timestamp`, opcional; hora da coleta offline).
  - `receivedAt` (`timestamp`, obrigatório; default `now()`; hora de recebimento no servidor).
  - `syncStatus` (`text`, obrigatório; default `'synced'`).
  - `createdAt` (`timestamp`, obrigatório; default `now()`).
- `bo_audit_log` (auditoria):
  - `id` (`uuid`, PK).
  - `boId` (`uuid`, obrigatório; referência ao B.O.).
  - `action` (`text`, obrigatório; `'update' | 'delete'`).
  - `policeIdentifier` (`text`, obrigatório).
  - `details` (`jsonb`, opcional; inclui `changedKeys`, `diff` ou `snapshot`, e `ip`).
  - `createdAt` (`timestamp`, obrigatório; default `now()`).

**Serviços e Integrações**
- `PDF (src/services/pdf.ts)`:
  - Usa `pdfkit` para gerar um `Buffer` de PDF com cabeçalho, dados da ocorrência, dados do comunicante e relato.
  - Formatação de data via `toLocaleString('pt-BR')`; tolera ausência de campos opcionais.
  - Não grava arquivo em disco; retorna `Buffer`. A pasta `uploads/pdfs/` está disponível para uma futura persistência em arquivo se desejado.
- `E-mail (src/services/email.ts)`:
  - Cliente `Resend` inicializado com `env.RESEND_API_KEY`.
  - Template HTML básico com dados de nome e ID do B.O.; anexa PDF (`base64`).
  - Mantém `emailLogs` em memória (em produção, mover para banco). Funções: `sendBoConfirmationEmail`, `getEmailLogs`.
- `Policial (src/services/police.ts)`:
  - `isValidPoliceIdentifier(id: string)` valida contra um conjunto mock de identificadores (`PM-0001`, `PM-0123`, etc.).
  - Esta validação é intencionalmente simples para fins de TCC e pode ser substituída por consulta externa.
- `IA (Gemini)`:
  - Transcrição: `@google/generative-ai` com `GoogleGenerativeAI`, modelo `gemini-2.5-flash`.
  - Extração estruturada: `@ai-sdk/google` + `ai.streamObject`, modelo `models/gemini-2.5-flash`, com schema Zod para mapear relato em campos do B.O.

**Fluxos de Funcionamento**
- Transcrição de Áudio:
  - Cliente envia áudio (`multipart/form-data`).
  - Backend converte para `base64` e chama Gemini.
  - Retorna texto transcrito; erros são logados e retornam 500.
- Preenchimento Automático (IA):
  - Cliente envia `userInput` com relato.
  - Backend streama a resposta da IA e tenta parsear para JSON conforme `boSchema`.
  - Em sucesso, retorna objeto com campos; em parse inválido, inclui `raw` para depuração.
- Registro de B.O.:
  - Valida e normaliza dados.
  - Persiste no Postgres via Drizzle.
  - Gera PDF e envia por e-mail (se `email` informado).
- Listagem e Busca:
  - Pagina resultados e aplica filtros.
  - Busca acento-insensitiva com `unaccent`.
- Atualização com Auditoria:
  - Valida autorização do policial.
  - Aplica regras de sanitização e normalização.
  - Grava diff detalhado em `bo_audit_log`.
- Exclusão com Auditoria:
  - Valida autorização.
  - Remove registro e guarda snapshot.
- Sincronização Offline:
  - Recebe lote com `localId` e timestamps.
  - Evita duplicações por `localId` e retorna mapeamentos.
  - Persiste dados e opcionalmente dispara e-mail.

**Segurança e Boas Práticas**
- Segredos em `.env` (não commitados; ver `.gitignore`).
- CORS habilitado (`@fastify/cors`).
- `police_identifier` exigido para UPDATE/DELETE (mock de autorização; recomenda-se substituição por autenticação real com JWT/OAuth e política de perfis).
- `Authorization` requerido para sync offline (placeholder; implementar autenticação robusta em produção).
- Recomenda-se habilitar `unaccent` no Postgres e revisar índices conforme carga real.

**Testes e Qualidade**
- Configuração (`vitest.config.ts`):
  - Carrega `.env.test`, usa `setupFiles: ['./tests/setup-db.ts']` para criar extensão `unaccent`.
  - `pool: 'threads'`, `fileParallelism: false`, `maxConcurrency: 1` para evitar condições de corrida com DB local.
- Cobertura:
  - Serviços: `pdf.test.ts` valida geração de `Buffer` e tolerância a campos opcionais; `police.test.ts` valida regras do mock.
  - Rotas: `register_bo.test.ts` cobre `POST`, `PUT` com auditoria e sanitização, e `DELETE` com auditoria; `list_and_search.test.ts` cobre paginação, filtro por tipo e busca `unaccent`.
- Banco de testes:
  - `scripts/create-test-db.ts` cria `ssp_bo_test` em `postgres` administrativo (`postgresql://docker:docker@localhost:5432/postgres`).

**Execução e Scripts**
- Instalação: `npm install`.
- Banco: `docker-compose up -d` → `npm run db:migrate` → opcional `npm run db:seed`.
- Desenvolvimento: `npm run dev` (usa `ts-node/esm` e `--experimental-strip-types`).
- Produção: `npm start` (mesma entrada do dev, ajustável conforme necessidade).
- Drizzle Studio: `npx drizzle-kit studio` para visualizar e gerenciar o banco.
- Lint: `npm run lint`.
- Testes: `npm test`.

**Arquivos Notáveis**
- `src/server.ts`: bootstrap do servidor e registro das rotas.
- `src/http/routes/transcription.ts`: transcrição com Gemini.
- `src/http/routes/autofill-bo.ts`: extração estruturada com IA.
- `src/http/routes/register_bo.ts`: CRUD + listagem + auditoria.
- `src/http/routes/sync-boletins.ts`: sincronização offline.
- `src/db/schema/register_bo.ts`: definição da tabela principal.
- `src/db/schema/bo_audit_log.ts`: definição da tabela de auditoria.
- `src/services/pdf.ts`: geração de PDF.
- `src/services/email.ts`: envio de e-mail via Resend.
- `src/services/police.ts`: validação mock de identificador policial.

**Limitações e Considerações**
- Autorização de policial é mockada; não há autenticação real de usuário/roles.
- `Authorization` para sync offline é apenas verificação de presença; implementar JWT/OAuth.
- PDFs não são persistidos em disco; apenas gerados em memória e enviados por e-mail.
- Dependência da extensão `unaccent` para busca acento-insensitiva — garantir instalação no ambiente.
- `EMAIL_FROM` default genérico; ajustar domínio e DKIM/SPF para entregabilidade em produção.
- Logs de e-mail mantidos em memória; mover para banco para rastreabilidade.

**Melhorias Futuras**
- Implementar autenticação/autorização robusta (JWT, RBAC) e auditoria de acesso.
- Persistir PDFs em `uploads/pdfs/` com retenção e controle de acesso.
- Adicionar índices em campos de busca frequente (`full_name`, `type_of_occurrence`, `created_at`).
- Criar endpoints para consultar `bo_audit_log` e exportar auditoria.
- Implementar rate limiting e validação de tamanho/formato de áudio em `/transcribe`.
- Internacionalização e mensagens mais ricas de erro/sucesso.
- Observabilidade: integrar com ferramentas de tracing/metrics e logs estruturados.

**Resumo Operacional**
- Em desenvolvimento:
  - `docker-compose up -d`
  - `cp .env.example .env` e preencher chaves.
  - `npm run db:migrate` → `npm run dev` → acessar `http://localhost:3333`.
  - Drizzle Studio: `npx drizzle-kit studio`.
- Em testes:
  - Executar `scripts/create-test-db.ts` quando necessário.
  - `npm test` com `.env.test` e extensão `unaccent` criada no setup.