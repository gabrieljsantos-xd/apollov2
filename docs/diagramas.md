# Diagramas Apollo

Documentação dos diagramas de classes, MER (banco de dados) e da relação entre domínio e tabelas.

## Diagrama de classes

```mermaid
classDiagram
    direction TB

    class Cliente {
        +int id
        +str nome
    }

    class Veiculo {
        +int id
        +int cliente_id
        +str placa
        +str marca
        +str modelo
        +int ano
        +str cor
        +str observacoes
        +str created_at
        +str updated_at
        +str cliente_nome
    }

    class Peca {
        +int id
        +str nome
        +str codigo
        +str sku
        +str codigo_fabricante
        +str descricao
        +str categoria
        +str fabricante
        +str fornecedor
        +int quantidade_estoque
        +int estoque_minimo
        +float preco_custo
        +float preco_venda
        +str localizacao
        +str status
        +str created_at
        +str ultima_atualizacao
        +str deleted_at
    }

    class MovimentacaoEstoque {
        +int id
        +int peca_id
        +str tipo
        +int quantidade_anterior
        +int quantidade_movimentada
        +int quantidade_final
        +str motivo
        +str usuario_responsavel
        +str created_at
    }

    class Orcamento {
        +int id
        +int cliente_id
        +int veiculo_id
        +str status
        +str observacoes
        +float valor_total
        +str created_at
        +str updated_at
        +list~OrcamentoItem~ itens
    }

    class OrcamentoItem {
        +int id
        +int orcamento_id
        +str descricao
        +float quantidade
        +float valor_unitario
        +int peca_id
    }

    class OrdemServico {
        +int id
        +int cliente_id
        +int veiculo_id
        +int orcamento_id
        +str status
        +str observacoes
        +float valor_total
        +str data_abertura
        +str data_conclusao
        +list~OrdemServicoItem~ itens
    }

    class OrdemServicoItem {
        +int id
        +int ordem_servico_id
        +str descricao
        +float quantidade
        +float valor_unitario
        +int peca_id
    }

    Cliente "1" --> "0..*" Veiculo : possui
    Cliente "1" --> "0..*" Orcamento : solicita
    Cliente "1" --> "0..*" OrdemServico : solicita
    Veiculo "1" --> "0..*" Orcamento : referencia
    Veiculo "1" --> "0..*" OrdemServico : referencia
    Orcamento "1" *-- "0..*" OrcamentoItem : contem
    OrdemServico "1" *-- "0..*" OrdemServicoItem : contem
    Orcamento "0..1" --> "0..1" OrdemServico : converte em
    Peca "1" --> "0..*" MovimentacaoEstoque : registra
    Peca "0..1" --> "0..*" OrcamentoItem : opcional
    Peca "0..1" --> "0..*" OrdemServicoItem : opcional
```

## MER (banco de dados)

```mermaid
erDiagram
    CLIENTES ||--o{ VEICULOS : "possui"
    CLIENTES ||--o{ ORCAMENTOS : "solicita"
    CLIENTES ||--o{ ORDENS_SERVICO : "solicita"
    VEICULOS ||--o{ ORCAMENTOS : "referencia"
    VEICULOS ||--o{ ORDENS_SERVICO : "referencia"
    ORCAMENTOS ||--o{ ORCAMENTO_ITENS : "contem"
    ORCAMENTOS |o--o| ORDENS_SERVICO : "converte_em"
    ORDENS_SERVICO ||--o{ ORDEM_SERVICO_ITENS : "contem"
    PECAS ||--o{ MOVIMENTACOES_ESTOQUE : "registra"
    PECAS |o--o{ ORCAMENTO_ITENS : "pode_vincular"
    PECAS |o--o{ ORDEM_SERVICO_ITENS : "pode_vincular"

    CLIENTES {
        serial id PK
        varchar nome
    }

    VEICULOS {
        serial id PK
        int cliente_id FK
        varchar placa UK
        varchar marca
        varchar modelo
        int ano
        varchar cor
        text observacoes
        timestamptz created_at
        timestamptz updated_at
    }

    PECAS {
        serial id PK
        varchar nome
        varchar codigo UK
        varchar sku UK
        varchar codigo_fabricante
        text descricao
        varchar categoria
        varchar fabricante
        varchar fornecedor
        int quantidade_estoque
        int estoque_minimo
        numeric preco_custo
        numeric preco_venda
        varchar localizacao
        varchar status
        timestamptz created_at
        timestamptz ultima_atualizacao
        timestamptz deleted_at
    }

    MOVIMENTACOES_ESTOQUE {
        serial id PK
        int peca_id FK
        varchar tipo
        int quantidade_anterior
        int quantidade_movimentada
        int quantidade_final
        varchar motivo
        varchar usuario_responsavel
        timestamptz created_at
    }

    ORCAMENTOS {
        serial id PK
        int cliente_id FK
        int veiculo_id FK
        varchar status
        text observacoes
        numeric valor_total
        timestamptz created_at
        timestamptz updated_at
    }

    ORCAMENTO_ITENS {
        serial id PK
        int orcamento_id FK
        varchar descricao
        numeric quantidade
        numeric valor_unitario
        int peca_id FK
    }

    ORDENS_SERVICO {
        serial id PK
        int cliente_id FK
        int veiculo_id FK
        int orcamento_id FK_UK
        varchar status
        text observacoes
        numeric valor_total
        timestamptz data_abertura
        timestamptz data_conclusao
        timestamptz created_at
        timestamptz updated_at
    }

    ORDEM_SERVICO_ITENS {
        serial id PK
        int ordem_servico_id FK
        varchar descricao
        numeric quantidade
        numeric valor_unitario
        int peca_id FK
    }
```

## Relação classe ↔ tabela

```mermaid
flowchart LR
    subgraph Dominio["Classes (app/models)"]
        C[Cliente]
        V[Veiculo]
        P[Peca]
        M[MovimentacaoEstoque]
        O[Orcamento]
        OI[OrcamentoItem]
        OS[OrdemServico]
        OSI[OrdemServicoItem]
    end

    subgraph Banco["Tabelas (database/init.sql)"]
        TC[clientes]
        TV[veiculos]
        TP[pecas]
        TM[movimentacoes_estoque]
        TO[orcamentos]
        TOI[orcamento_itens]
        TOS[ordens_servico]
        TOSI[ordem_servico_itens]
    end

    C --- TC
    V --- TV
    P --- TP
    M --- TM
    O --- TO
    OI --- TOI
    OS --- TOS
    OSI --- TOSI
```

## Cardinalidades principais

- Cliente **1:N** Veículo / Orçamento / Ordem de Serviço
- Orçamento **1:N** Itens
- Ordem de Serviço **1:N** Itens
- Orçamento **0..1 ↔ 0..1** Ordem de Serviço (`orcamento_id` UNIQUE)
- Peça **1:N** Movimentações de estoque
- Peça **opcional** nos itens de orçamento e OS
