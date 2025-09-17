# Concierge (Agente de IA)

## Cabeçalho e Contexto

**Nome**: Concierge AI Assistant  
**Descrição**: Agente de IA especializado em sugestões de viagem e criação automática de eventos na timeline  
**Status**: Ativo

### Rotas e Módulos
- **Frontend**: `/trip/$travelId/concierge` (chat interface)
- **Backend**: `concierge.routes.ts` (oRPC)
- **Serviços**: `concierge.service.ts`
- **Modelos**: OpenRouter (GLM-4.5-Air), Perplexity para web search

---

## Visão Geral da Feature

### Problema que Resolve
Durante o planejamento de viagens, usuários frequentemente precisam de sugestões personalizadas sobre atividades, restaurantes e logística. O processo manual de pesquisa e adição de eventos na timeline é demorado e pode resultar em planejamento subótimo.

### Valor para o Usuário
- **Sugestões inteligentes**: Recomendações contextualizadas baseadas no destino e preferências
- **Automação de eventos**: Criação automática de eventos na timeline com confirmação do usuário
- **Pesquisa web integrada**: Acesso a informações atualizadas sobre destinos
- **Interface conversacional**: Interação natural via chat para planejamento colaborativo

### Principais Casos de Uso
1. **Sugestão de Atividades**: "O que fazer em Paris durante 3 dias?"
2. **Recomendações Gastronômicas**: "Melhores restaurantes em Roma perto do Coliseu"
3. **Planejamento de Transporte**: "Como ir do hotel ao aeroporto em Tóquio?"
4. **Criação Automática de Eventos**: Sugestões se tornam eventos na timeline com confirmação

---

## Entidades Específicas

### Chat Session
```
Atributos:
- chatId: string (identificador único da sessão)
- messages: UIMessage[] (histórico da conversa)
- webSearch: boolean (se deve usar pesquisa web)

Estados possíveis:
- Ativa: conversation em andamento
- Streaming: resposta sendo gerada
- Aguardando confirmação: tool call pendente
```

### Tool Invocation (Criação de Eventos)
```
Atributos:
- toolCallId: string
- toolName: "createEvent"
- args: CreateEventToolSchema
- status: "pending" | "confirmed" | "rejected"

Tipos de eventos sugeridos:
- activity: atividades turísticas
- food: refeições e experiências gastronômicas  
- travel: transporte e deslocamentos
```

### Relacionamentos
- **Com Travel**: sessões de chat vinculadas a uma viagem específica
- **Com Event Timeline**: criação automática de eventos via tool calls
- **Com Member**: histórico de conversas por usuário

---

## Processos de Negócio

### Fluxo Principal: Conversa com Sugestões
1. **Inicialização**: Usuário acessa `/trip/$travelId/concierge`
2. **Entrada de Prompt**: Usuário digita pergunta sobre a viagem
3. **Processamento IA**: Sistema processa com modelo GLM-4.5-Air ou Perplexity
4. **Resposta Streaming**: Resposta gerada em tempo real via Server-Sent Events
5. **Tool Invocation**: IA pode sugerir criação de eventos específicos
6. **Confirmação Humana**: Usuário aprova/rejeita sugestões de eventos
7. **Execução**: Eventos aprovados são criados na timeline

### Fluxo Alternativo: Pesquisa Web
1. **Ativação Web Search**: Usuário ou contexto ativa pesquisa web
2. **Modelo Perplexity**: Sistema usa Perplexity para informações atualizadas
3. **Resposta Enriquecida**: Informações em tempo real sobre destinos/atividades

### Casos Edge
- **Token Limit**: Conversas longas são truncadas mantendo contexto relevante
- **API Failure**: Fallback para modelo alternativo ou mensagem de erro
- **Tool Rejection**: Sugestões rejeitadas não interrompem a conversa
- **Rate Limiting**: Controle de frequência de chamadas à API

### Integrações
- **Event Timeline**: Criação automática de eventos via tool calls
- **Travel Context**: Acesso a informações da viagem (destino, datas, membros)
- **External APIs**: OpenRouter e Perplexity para capacidades de IA

---

## Regras Específicas

### Validações
- Chat ID deve ser válido e único por sessão
- Mensagens devem seguir formato UIMessage padrão
- Tool calls devem ter schemas Zod válidos
- Web search só disponível para modelos compatíveis

### Permissões
- **Owner**: Acesso completo ao chat e confirmação de eventos
- **Member**: Pode conversar mas eventos criados ficam pendentes de aprovação do owner
- **Guest**: Sem acesso ao concierge

### Restrições
- Máximo de 100 mensagens por sessão (truncamento automático)
- Tool calls limitados a tipos de evento permitidos (activity, food, travel)
- Web search limitado por rate limits da Perplexity

### Invariantes
- **Human-in-the-loop obrigatório**: Tool calls NUNCA executam automaticamente
- **Contexto de viagem**: Chat sempre vinculado a uma travel específica
- **Streaming consistente**: Respostas sempre via Server-Sent Events
- **Fallback gracioso**: Sistema deve degradar graciosamente em caso de falhas

---

## Arquitetura Técnica

### Limites da Feature
- **Responsabilidade**: Interface de chat, processamento de IA, tool call management
- **Não responsável**: Execução final dos events (delegado ao event-timeline)
- **Entrada**: Mensagens do usuário, contexto da viagem
- **Saída**: Respostas streaming, tool invocations para confirmação

### APIs/Contratos
```typescript
// oRPC routes
interface ConciergeChatInput {
  chatId: string;
  messages: UIMessage[];
  webSearch?: boolean;
}

// Tool schema
interface CreateEventToolSchema {
  title: string;
  type: 'activity' | 'food' | 'travel';
  startDate: string;
  location?: string;
  description?: string;
}
```

### Dependências
- **Internas**: 
  - `event-timeline` (para criação de eventos)
  - `travel-management` (para contexto da viagem)
- **Externas**: 
  - OpenRouter API (modelos de IA)
  - Perplexity API (web search)
  - Vercel AI SDK v5 (tool calling, streaming)

### Eventos/Side Effects
- **Eventos emitidos**: `tool-call-created`, `event-suggestion-made`
- **Eventos consumidos**: `travel-context-updated` (para atualizar contexto)

---

## Decisões e Trade-offs

### Decisões Específicas
- **Modelo GLM-4.5-Air gratuito**: Escolhido por cost-effectiveness vs qualidade
- **Human-in-the-loop obrigatório**: Evita criação acidental de eventos indesejados
- **Streaming via SSE**: Melhor UX para respostas longas vs simplicidade
- **Tool calls via Vercel AI SDK**: Padrão da indústria vs implementação custom

### Limitações Conhecidas
- **Contexto limitado**: Modelo não tem acesso completo aos dados da viagem
- **Dependência de APIs externas**: Rate limits e disponibilidade de terceiros
- **Multilingual limitado**: Otimizado para português, suporte básico a outros idiomas
- **Sem memória persistente**: Cada sessão é independente

### TODOs Futuros
- [ ] Implementar memória persistente de conversas
- [ ] Adicionar suporte a anexos (fotos, documentos)
- [ ] Integrar com APIs de reservas (booking, Airbnb)
- [ ] Melhorar contexto com dados estruturados da viagem
- [ ] Suporte a múltiplos idiomas
- [ ] Tool calls para edição de eventos existentes

---

## Relacionamentos

### Features Dependentes
- **Event Timeline**: Recebe eventos criados via tool calls do concierge
- **Travel Overview**: Pode exibir sugestões do concierge na dashboard

### Features das quais Depende
- **Travel Management**: Contexto da viagem (destino, datas, orçamento)
- **Member Management**: Permissões para uso do chat e criação de eventos
- **Authentication**: Controle de acesso às funcionalidades

### Impactos Cross-Feature
- **Mudanças no Event Schema**: Afetar tool call schemas
- **Alterações de Permissões**: Impactar quem pode usar o concierge
- **Travel Context Changes**: Afetar qualidade das sugestões

---

## Veja Também

### Documentação de Domínio
- [vocabulary.md](./vocabulary.md#concierge) - Glossário de termos
- [entities.md](./entities.md) - Entidades principais
- [architecture.md](./architecture.md) - Arquitetura conceitual
- [decisions.md](./decisions.md) - Decisões de arquitetura

### Outras Features
- [processes.md](./processes.md) - Criação de eventos e processos de negócio
- [entities.md](./entities.md) - Contexto da viagem e entidades
- [business-rules.md](./business-rules.md) - Permissões e regras de acesso

### Implementação
- Código: `src/orpc/modules/concierge/`
- Rotas: `src/routes/trip/$travelId/concierge.tsx`
- Componentes: `src/components/ConciergeAgent.tsx`
- Testes: `src/orpc/modules/concierge/concierge.test.ts`

### Recursos Externos
- [Vercel AI SDK v5 Documentation](https://sdk.vercel.ai/docs)
- [OpenRouter API Reference](https://openrouter.ai/docs)
- [Perplexity API Documentation](https://docs.perplexity.ai/)

---

## Backreferences
- [overview.md](./overview.md)
- [decisions.md](./decisions.md)
- [design-system.md](./design-system.md)