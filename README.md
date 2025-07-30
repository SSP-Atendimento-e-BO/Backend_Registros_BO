# Projeto de Transcrição de Áudio com IA

Este projeto consiste em uma API de transcrição de áudio que utiliza o modelo de inteligência artificial **Gemini-1.5-flash** do Google. A API é construída com **Fastify** e se comunica com um banco de dados **PostgreSQL** através do ORM **Drizzle**.

## Arquitetura de Pastas

A estrutura de pastas do projeto é organizada da seguinte forma:

```
/
├── docker/
│   └── postgres_data/      # Dados persistentes do contêiner Docker do PostgreSQL
├── src/
│   ├── db/
│   │   ├── migrations/     # Arquivos de migração do banco de dados gerados pelo Drizzle
│   │   ├── schema/         # Definições de esquema do banco de dados
│   │   ├── connection.ts   # Configuração da conexão com o banco de dados
│   │   └── seed.ts         # Script para popular o banco de dados com dados de exemplo
│   ├── http/
│   │   └── routes/
│   │       └── transcription.ts  # Definição da rota de transcrição
│   ├── env.ts              # Validação e exportação de variáveis de ambiente com Zod
│   └── server.ts           # Arquivo principal do servidor Fastify
├── .env.example            # Arquivo de exemplo para variáveis de ambiente
├── .eslintrc.json          # Configurações do ESLint para qualidade de código
├── .gitignore              # Arquivos e pastas a serem ignorados pelo Git
├── docker-compose.yml      # Configuração do contêiner Docker para o PostgreSQL
├── drizzle.config.ts       # Configuração do Drizzle ORM
├── package.json            # Dependências e scripts do projeto
└── tsconfig.json           # Configurações do TypeScript
```

## Como Rodar o Sistema

Siga os passos abaixo para configurar e executar o projeto em seu ambiente de desenvolvimento.

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 20 ou superior)
- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/)
- Um editor de código de sua preferência (ex: [VS Code](https://code.visualstudio.com/))

### 1. Clonar o Repositório

```bash
git clone <URL_DO_REPOSITORIO>
cd transcricao
```

### 2. Instalar Dependências

Instale todas as dependências do projeto listadas no `package.json`.

```bash
npm install
```

### 3. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo `.env.example` para um novo arquivo chamado `.env` e preencha as variáveis necessárias.

```bash
cp .env.example .env
```

O arquivo `.env` deve conter as seguintes variáveis:

```
DATABASE_URL="postgresql://docker:docker@localhost:5432/ssp_bo"
GEMINI_API_KEY="SUA_CHAVE_DE_API_DO_GEMINI"
```

- `DATABASE_URL`: URL de conexão com o banco de dados PostgreSQL. A configuração padrão corresponde ao serviço definido no `docker-compose.yml`.
- `GEMINI_API_KEY`: Sua chave de API para utilizar o serviço do Google Gemini.

### 4. Iniciar o Banco de Dados com Docker

Utilize o Docker Compose para iniciar o contêiner do PostgreSQL em segundo plano.

```bash
docker-compose up -d
```

Este comando irá criar e iniciar um serviço `transcription` com uma imagem do PostgreSQL, conforme definido no arquivo `docker-compose.yml`.

### 5. Gerar e Aplicar as Migrações do Banco de Dados

Com o banco de dados em execução, você pode gerar e aplicar as migrações para criar as tabelas necessárias.

**Gerar Migrações (opcional, se houver alterações no schema):**

Se você modificar os arquivos em `src/db/schema`, precisará gerar um novo arquivo de migração.

```bash
npm run db:generate
```

**Aplicar Migrações:**

Execute as migrações pendentes para atualizar o banco de dados.

```bash
npm run db:migrate
```

### 6. Popular o Banco de Dados (Opcional)

Para popular o banco de dados com dados de exemplo, execute o script de seed.

```bash
npm run db:seed
```

### 7. Iniciar o Servidor de Desenvolvimento

Inicie o servidor Fastify em modo de desenvolvimento.

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3333`.

### 8. Visualizar o Banco de Dados com Drizzle Studio

O Drizzle Kit vem com uma ferramenta de estúdio baseada na web que permite navegar e gerenciar seu banco de dados.

Para iniciá-lo, execute o seguinte comando:

```bash
npx drizzle-kit studio
```

Isso abrirá uma nova aba no seu navegador com a interface do Drizzle Studio.

## Endpoint da API

### POST /transcribe

Este endpoint aceita um arquivo de áudio e retorna a transcrição do mesmo.

- **Método:** `POST`
- **URL:** `/transcribe`
- **Corpo da Requisição:** `multipart/form-data` com um campo contendo o arquivo de áudio.

**Exemplo de uso com `curl`:**

```bash
curl -X POST -F "file=@/caminho/para/seu/audio.mp3" http://localhost:3333/transcribe
```

**Resposta de Sucesso (200 OK):**

```json
{
  "text": "Esta é a transcrição do seu áudio."
}
```

**Resposta de Erro (400 Bad Request):**

```json
{
  "error": "Arquivo de áudio ausente."
}
```

## Schema do Banco de Dados

A tabela principal utilizada no projeto é a `register_bo`.

- **Tabela:** `register_bo`
  - `id` (uuid, chave primária): Identificador único do registro.
  - `transcription` (text): Texto da transcrição do áudio.
  - `created_at` (timestamp): Data e hora de criação do registro.
