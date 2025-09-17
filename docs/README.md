# Documentação do Tony Travel

Esta é a documentação flat do sistema Tony Travel, organizada em arquivos individuais para fácil navegação e manutenção.

## Documentação de Domínio

### Visão Geral e Conceitos
- [📋 Visão Geral](./overview.md) - Objetivo, valor e personas do produto
- [📖 Vocabulário](./vocabulary.md) - Glossário de termos canônicos
- [🏗️ Arquitetura](./architecture.md) - Organização de módulos e fluxo de dados
- [📐 Decisões](./decisions.md) - ADRs e trade-offs arquiteturais
- [🎨 Design System](./design-system.md) - Identidade visual e diretrizes de marca

### Modelos e Regras
- [🏢 Entidades](./entities.md) - Principais entidades e relacionamentos
- [🔄 Processos](./processes.md) - Fluxos de negócio e entradas/saídas
- [⚖️ Regras de Negócio](./business-rules.md) - Invariantes e políticas

## Features Específicas

### IA e Assistente
- [🤖 Concierge](./concierge.md) - Assistente de IA para sugestões de viagem

### Outras Features
*Em desenvolvimento - adicionar conforme features são documentadas*

## Como Navegar

### Por Tipo de Informação
- **Entendimento inicial**: comece com [overview.md](./overview.md) e [vocabulary.md](./vocabulary.md)
- **Arquitetura de sistema**: veja [architecture.md](./architecture.md) e [decisions.md](./decisions.md)
- **Regras de negócio**: consulte [business-rules.md](./business-rules.md) e [processes.md](./processes.md)
- **Features específicas**: acesse os arquivos individuais de features (ex: [concierge.md](./concierge.md))

### Links Cruzados
Cada arquivo contém seções "Veja também" e "Backreferences" para navegação entre documentos relacionados.

## Princípios da Documentação

- **Flat Structure**: arquivos únicos em docs/ para simplicidade
- **Granularidade por Feature**: cada funcionalidade tem seu arquivo próprio
- **Links Bidirecionais**: referências cruzadas mantidas atualizadas
- **LLM-Ready**: linguagem clara para assistentes de IA
- **Separação Domínio/Feature**: conceitos gerais vs. funcionalidades específicas

## Manutenção

Esta documentação é mantida pelo agente `docs-knowledge-maintainer` conforme mudanças no produto. Para atualizações, consulte as instruções no arquivo `.claude/agents/docs-knowledge-maintainer.md`.

---

**Última atualização**: Migração para estrutura flat - Setembro 2025