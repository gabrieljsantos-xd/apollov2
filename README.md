# Apollo

Aplicacao web para gestao de clientes e estoque de pecas de uma oficina mecanica.

## Estrutura do projeto

```text
app/
├── controllers/       # Regras de fluxo e validacao
├── models/            # Entidades do dominio
├── repositories/      # Persistencia no banco de dados
├── views/             # Frontend React
│   └── frontend/
│       ├── src/
│       ├── package.json
│       └── vite.config.js
├── __init__.py
├── ...
database/
├── init.sql           # Schema inicial do banco
nginx/
├── nginx.conf
requirements.txt
web.py                 # Aplicacao Flask
Dockerfile
docker-compose.yml
tests/
└── test_cliente_controller.py
```

O frontend React fica em `app/views/frontend`. O build e feito automaticamente na etapa Node do `Dockerfile` e servido pelo Flask na mesma origem da API.

## Executar

```bash
python3 -m unittest discover -s tests -v
```

O backend e executado pelo `web.py`.

## Executar com Docker

```bash
docker compose up --build
docker compose up --build --scale app=2
```

O Nginx fica disponivel em `http://localhost` e encaminha as requisicoes para o servico `app`. O Postgres usa o volume `postgres_data` e fica acessivel apenas pela rede interna do Compose.

## Banco de dados

O banco utilizado e PostgreSQL. O schema principal e carregado por `database/init.sql` e inclui as seguintes tabelas.

### 1. clientes

Tabela para cadastro de clientes da oficina.

Campos principais:
- `id` - identificador unico
- `nome` - nome do cliente

Relacionamentos:
- `clientes` e referenciada por `veiculos`, `orcamentos` e `ordens_servico`.

### 2. pecas

Tabela principal para o controle de estoque de pecas.

Campos principais:
- `id` - identificador unico
- `nome` - nome da peca
- `codigo` - codigo unico da peca
- `sku` - identificador unico do fornecedor/produto
- `codigo_fabricante` - codigo do fabricante
- `descricao` - descricao detalhada
- `categoria` - categoria da peca
- `fabricante` - fabricante da peca
- `fornecedor` - fornecedor da peca
- `quantidade_estoque` - quantidade atual em estoque
- `estoque_minimo` - estoque minimo recomendado
- `preco_custo` - preco de custo
- `preco_venda` - preco de venda
- `localizacao` - setor/localizacao no estoque
- `status` - status da peca (`ativo` ou `inativo`)
- `created_at` - data de criacao
- `ultima_atualizacao` - ultima data de alteracao
- `deleted_at` - marca logica de exclusao

Relacionamentos:
- `pecas` e referenciada por `movimentacoes_estoque` via `peca_id`.
- Possui indice para busca por nome, codigo, SKU, fabricante, categoria e status.

### 3. movimentacoes_estoque

Tabela de auditoria das movimentacoes de estoque.

Campos principais:
- `id` - identificador unico
- `peca_id` - referencia a peca movimentada
- `tipo` - tipo da movimentacao (`entrada`, `saida`, `ajuste`)
- `quantidade_anterior` - quantidade antes da movimentacao
- `quantidade_movimentada` - quantidade movimentada
- `quantidade_final` - quantidade final apos a movimentacao
- `motivo` - motivo da movimentacao
- `usuario_responsavel` - usuario responsavel pela operacao
- `created_at` - data da movimentacao

Relacionamentos:
- `movimentacoes_estoque.peca_id` -> `pecas.id`
- Cada alteracao de estoque gera um registro nesta tabela para rastreabilidade.

### 4. veiculos

Tabela de veiculos dos clientes.

Campos principais:
- `id` - identificador unico
- `cliente_id` - cliente dono do veiculo
- `placa` - placa unica
- `marca`, `modelo`, `ano`, `cor`
- `observacoes`

### 5. orcamentos e orcamento_itens

Orcamentos comerciais com itens (servicos/pecas), status e valor total.
Pode ser convertido em ordem de servico.

### 6. ordens_servico e ordem_servico_itens

Ordens de servico da oficina, com status operacional, itens e vinculo opcional a um orcamento.

## Relacao entre tabelas

```text
clientes
  └── 1:N ──> veiculos
  └── 1:N ──> orcamentos
  └── 1:N ──> ordens_servico

veiculos
  └── 1:N ──> orcamentos
  └── 1:N ──> ordens_servico

orcamentos
  └── 1:N ──> orcamento_itens
  └── 1:1 ──> ordens_servico (opcional, apos conversao)

ordens_servico
  └── 1:N ──> ordem_servico_itens

pecas
  └── 1:N ──> movimentacoes_estoque
```

Em resumo:
- `clientes` e `veiculos` formam a base de cadastro.
- `orcamentos` e `ordens_servico` usam cliente, veiculo e itens.
- `pecas` e `movimentacoes_estoque` controlam o estoque.

## Observacoes

- A tabela `pecas` usa `deleted_at` para exclusao logica, mantendo o registro historico.
- A tabela `movimentacoes_estoque` e usada para auditoria e acompanhamento do fluxo de estoque.
- O schema e criado automaticamente pela inicializacao do banco em `docker-compose.yml`.
