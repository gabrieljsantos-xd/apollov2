CREATE TABLE IF NOT EXISTS clientes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(120) NOT NULL
);

CREATE TABLE IF NOT EXISTS pecas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    sku VARCHAR(100) NOT NULL UNIQUE,
    codigo_fabricante VARCHAR(100),
    descricao TEXT,
    categoria VARCHAR(120),
    fabricante VARCHAR(150),
    fornecedor VARCHAR(150),
    quantidade_estoque INTEGER NOT NULL DEFAULT 0 CHECK (quantidade_estoque >= 0),
    estoque_minimo INTEGER NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
    preco_custo NUMERIC(12, 2) NOT NULL DEFAULT 0,
    preco_venda NUMERIC(12, 2) NOT NULL DEFAULT 0,
    localizacao VARCHAR(120),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultima_atualizacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
    id SERIAL PRIMARY KEY,
    peca_id INTEGER NOT NULL REFERENCES pecas(id) ON DELETE RESTRICT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
    quantidade_anterior INTEGER NOT NULL DEFAULT 0,
    quantidade_movimentada INTEGER NOT NULL,
    quantidade_final INTEGER NOT NULL,
    motivo VARCHAR(255),
    usuario_responsavel VARCHAR(150) NOT NULL DEFAULT 'sistema',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pecas_nome ON pecas (nome);
CREATE INDEX IF NOT EXISTS idx_pecas_codigo ON pecas (codigo);
CREATE INDEX IF NOT EXISTS idx_pecas_sku ON pecas (sku);
CREATE INDEX IF NOT EXISTS idx_pecas_fabricante ON pecas (fabricante);
CREATE INDEX IF NOT EXISTS idx_pecas_categoria ON pecas (categoria);
CREATE INDEX IF NOT EXISTS idx_pecas_status ON pecas (status);
CREATE INDEX IF NOT EXISTS idx_pecas_deleted_at ON pecas (deleted_at);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_peca_id ON movimentacoes_estoque (peca_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_created_at ON movimentacoes_estoque (created_at DESC);

CREATE TABLE IF NOT EXISTS veiculos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    placa VARCHAR(10) NOT NULL UNIQUE,
    marca VARCHAR(80) NOT NULL,
    modelo VARCHAR(120) NOT NULL,
    ano INTEGER,
    cor VARCHAR(60),
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orcamentos (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'enviado', 'aprovado', 'rejeitado', 'convertido')),
    observacoes TEXT,
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orcamento_itens (
    id SERIAL PRIMARY KEY,
    orcamento_id INTEGER NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    descricao VARCHAR(255) NOT NULL,
    quantidade NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    valor_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
    peca_id INTEGER REFERENCES pecas(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS ordens_servico (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
    veiculo_id INTEGER NOT NULL REFERENCES veiculos(id) ON DELETE RESTRICT,
    orcamento_id INTEGER UNIQUE REFERENCES orcamentos(id) ON DELETE SET NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'aberta'
        CHECK (status IN ('aberta', 'em_andamento', 'aguardando_pecas', 'concluida', 'cancelada')),
    observacoes TEXT,
    valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
    data_abertura TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_conclusao TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ordem_servico_itens (
    id SERIAL PRIMARY KEY,
    ordem_servico_id INTEGER NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
    descricao VARCHAR(255) NOT NULL,
    quantidade NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    valor_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
    peca_id INTEGER REFERENCES pecas(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_veiculos_cliente_id ON veiculos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos (placa);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente_id ON orcamentos (cliente_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_veiculo_id ON orcamentos (veiculo_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON orcamentos (status);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_orcamento_id ON orcamento_itens (orcamento_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente_id ON ordens_servico (cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_veiculo_id ON ordens_servico (veiculo_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON ordens_servico (status);
CREATE INDEX IF NOT EXISTS idx_ordem_servico_itens_os_id ON ordem_servico_itens (ordem_servico_id);
