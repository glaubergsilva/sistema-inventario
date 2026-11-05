-- Esquema do Portal de Inventário (Cloudflare D1 / SQLite)
-- Aplicar no D1:  npx wrangler d1 execute <nome-do-banco> --remote --file=db/schema.sql
-- (o portal também cria as tabelas automaticamente na primeira execução)

CREATE TABLE IF NOT EXISTS empresas (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  cnpj       TEXT,
  token      TEXT NOT NULL UNIQUE,
  ativo      INTEGER NOT NULL DEFAULT 1,
  criado_em  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuarios (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,
  admin       INTEGER NOT NULL DEFAULT 0,
  ativo       INTEGER NOT NULL DEFAULT 1,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS usuario_empresas (
  usuario_id  INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  empresa_id  INTEGER NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, empresa_id)
);

CREATE TABLE IF NOT EXISTS estacoes (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id        INTEGER NOT NULL REFERENCES empresas(id),
  machine_id        TEXT NOT NULL UNIQUE,
  hostname          TEXT,
  dominio           TEXT,
  usuario_logado    TEXT,
  so_nome           TEXT,
  so_versao         TEXT,
  fabricante        TEXT,
  modelo            TEXT,
  numero_serie      TEXT,
  cpu               TEXT,
  memoria_bytes     INTEGER,
  disco_total_bytes INTEGER,
  disco_livre_bytes INTEGER,
  ip                TEXT,
  programas_qtd     INTEGER,
  desktop_arquivos  INTEGER,
  desktop_bytes     INTEGER,
  documentos_arquivos INTEGER,
  documentos_bytes    INTEGER,
  documentos_coleta   TEXT,
  versao_agente     TEXT,
  primeira_coleta   TEXT NOT NULL DEFAULT (datetime('now')),
  ultima_coleta     TEXT NOT NULL DEFAULT (datetime('now')),
  observacoes       TEXT
);
CREATE INDEX IF NOT EXISTS idx_estacoes_empresa ON estacoes(empresa_id);

-- Dados detalhados da última coleta (JSON)
CREATE TABLE IF NOT EXISTS estacao_detalhes (
  estacao_id      INTEGER PRIMARY KEY REFERENCES estacoes(id) ON DELETE CASCADE,
  hardware_json   TEXT,
  discos_json     TEXT,
  rede_json       TEXT,
  programas_json  TEXT,
  desktop_json    TEXT,
  erros_json      TEXT
);

-- Última varredura da pasta Documentos (feita em intervalo próprio, padrão 24h)
CREATE TABLE IF NOT EXISTS estacao_documentos (
  estacao_id      INTEGER PRIMARY KEY REFERENCES estacoes(id) ON DELETE CASCADE,
  documentos_json TEXT
);
