# Diagrama de classes — Apollo

Diagrama UML das classes de domínio (`app/models`).

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

## Cardinalidades

- Cliente **1:N** Veículo / Orçamento / Ordem de Serviço
- Orçamento **1:N** Itens
- Ordem de Serviço **1:N** Itens
- Orçamento **0..1 ↔ 0..1** Ordem de Serviço
- Peça **1:N** Movimentações de estoque
- Peça **opcional** nos itens de orçamento e OS
