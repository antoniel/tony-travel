# Módulos oRPC

Este documento descreve a arquitetura e organização dos módulos backend baseados em oRPC no Tony Travel.

## Visão Geral

O Tony Travel utiliza oRPC (OpenRPC) como base para sua arquitetura backend, proporcionando APIs type-safe com validação automática e geração de tipos. A aplicação está organizada em módulos domínio-específicos que seguem um padrão arquitetural consistente.

### Estrutura dos Módulos

Cada módulo oRPC segue a seguinte estrutura padrão:

```
src/orpc/modules/{domain}/
├── {domain}.routes.ts    # Definições de rotas e endpoints
├── {domain}.service.ts   # Lógica de negócio e validações
├── {domain}.dao.ts       # Camada de acesso a dados
├── {domain}.model.ts     # Tipos e esquemas Zod
├── {domain}.errors.ts    # Definições de erros específicos
└── {domain}.test.ts      # Testes unitários
```

## Módulos Disponíveis

### 1. Travel (Viagens)
**Responsabilidade**: Gerenciamento central de viagens, incluindo criação, edição, membros e configurações.

**Principais rotas**:
- `saveTravel` - Criação de novas viagens
- `getTravel` - Busca de viagem por ID com relações
- `listTravels` - Listagem de viagens com filtros
- `updateTravel` - Atualização de configurações da viagem
- `deleteTravel` - Exclusão lógica de viagens
- `getTravelMembers` - Gerenciamento de membros
- `searchAirports` - Busca de aeroportos
- `searchDestinations` - Busca de destinos
- `featuredTravels` - Viagens em destaque baseadas em completude

**Características especiais**:
- Suporte a aeroportos de destino com dados enriquecidos
- Sistema de membros com papéis (owner/member)
- Validação de datas automática
- Transações para operações complexas

### 2. Event (Eventos)
**Responsabilidade**: Gerenciamento de eventos e atividades dentro das viagens.

**Tipos de eventos**:
- `travel` - Eventos de viagem/transporte
- `food` - Eventos gastronômicos
- `activity` - Atividades e passeios

**Funcionalidades**:
- Eventos com dependências hierárquicas
- Estimativas e custos reais
- Metadados de imagens automáticos
- Integração com timeline da viagem

### 3. Accommodation (Acomodações)
**Responsabilidade**: Gerenciamento de hospedagens.

**Tipos suportados**:
- Hotel, Hostel, Airbnb, Resort, Outros

**Funcionalidades**:
- Controle de datas de check-in/check-out
- Gestão de preços e endereços
- Validação de disponibilidade

### 4. Flight (Voos)
**Responsabilidade**: Gerenciamento de voos e participantes.

**Funcionalidades**:
- Dados completos de voo (origem, destino, horários)
- Sistema de participantes por voo
- Integração com dados de aeroportos

### 5. Financial (Financeiro)
**Responsabilidade**: Gestão financeira das viagens.

**Funcionalidades**:
- Controle de orçamentos
- Rastreamento de gastos
- Relatórios financeiros

### 6. Invitation (Convites)
**Responsabilidade**: Sistema de convites para viagens.

**Funcionalidades**:
- Tokens únicos de convite
- Controle de expiração
- Estados ativos/inativos

### 7. Concierge (Concierge IA)
**Responsabilidade**: Assistente virtual com IA para planejamento de viagens.

**Funcionalidades**:
- Integração com Vercel AI SDK
- Ferramentas para criação de eventos
- Processamento de linguagem natural
- Context-aware responses

## Padrões Arquiteturais

### 1. Procedimentos Tipados

O sistema utiliza procedimentos tipados baseados em contexto:

```typescript
// Procedimento básico com logging
export const baseProcedure = os.$context<AppOrpcContext>().use(logger);

// Procedimento com autenticação obrigatória
export const authProcedure = baseProcedure.use(requireAuth);

// Procedimento com autenticação opcional
export const optionalAuthProcedure = baseProcedure.use(optionalAuth);

// Procedimento para membros de viagem
export const travelMemberProcedure = authProcedure.use(requireTravelMember());

// Procedimento para proprietários de viagem
export const travelOwnerProcedure = authProcedure.use(requireTravelMember("owner"));
```

### 2. Middleware de Autorização

Sistema de autorização baseado em contexto que verifica:
- **Autenticação**: Presença de usuário válido
- **Membership**: Participação na viagem específica
- **Roles**: Diferentes níveis de permissão (owner/member)

```typescript
// Exemplo de verificação automática
const requireTravelMember = (role?: "owner" | "member") =>
  os.$context<AppOrpcContext>().middleware(async ({ context, next }, input) => {
    // Validação de membership e role
    // Adição de contexto de membership
  });
```

### 3. Validação com Zod

Todos os inputs e outputs são validados usando esquemas Zod:

```typescript
export const saveTravel = authProcedure
  .errors(travelErrors)
  .input(z.object({ travel: InsertFullTravel }))
  .output(z.object({ id: z.string(), travel: TravelSchema }))
  .handler(async ({ input, context }) => {
    // Implementação
  });
```

### 4. Tratamento de Erros

Sistema unificado de tratamento de erros com tipos específicos:

```typescript
// Definição de erros por módulo
export const travelErrors = {
  TRAVEL_NOT_FOUND: {
    message: "Viagem não encontrada"
  },
  TRAVEL_CREATION_FAILED: {
    message: "Falha ao criar viagem"
  },
  USER_NOT_AUTHORIZED: {
    message: "Usuário não autorizado"
  }
} as const;
```

### 5. Transações de Banco

Operações complexas utilizam transações para garantir consistência:

```typescript
// Uso de transação na criação de viagem
const result = await db.transaction(async (tx) => {
  const travelId = await travelDAO.createTravelWithTransaction(tx, travelData);
  const travelMemberId = await travelDAO.createTravelMemberWithTransaction(tx, memberData);
  return { id: travelId, travel: await travelDAO.getTravelByIdWithTransaction(tx, travelId) };
});
```

## Router Central

O router central (`src/orpc/router/index.ts`) agrega todos os módulos:

```typescript
export default {
  travelRoutes,
  flightRoutes,
  accommodationRoutes,
  eventRoutes,
  invitationRoutes,
  financialRoutes,
  conciergeRoutes,
};
```

## Contexto da Aplicação

### AppOrpcContext

Interface base que todos os procedimentos utilizam:

```typescript
export interface AppOrpcContext extends RequestHeadersPluginContext {
  db: DB;
}
```

### Contextos Estendidos

- **AuthContext**: Adiciona `user` e `session`
- **TravelMembershipContext**: Adiciona `travelMembership` com role e detalhes

## Cliente oRPC

O cliente é configurado automaticamente com tipos inferidos:

```typescript
// src/orpc/client.ts
export const orpc = createORPCReactQueryClient({
  baseURL: "/api/orpc",
  fetch: customFetch,
});
```

## Benefícios da Arquitetura

1. **Type Safety**: Tipos automáticos end-to-end
2. **Validação**: Validação de entrada e saída automática
3. **Autorização**: Sistema de permissões flexível e reutilizável
4. **Modularidade**: Separação clara de responsabilidades
5. **Testabilidade**: Estrutura que facilita testes unitários
6. **Consistência**: Padrões uniformes entre módulos
7. **Error Handling**: Tratamento de erros tipado e consistente

## Próximos Passos

- Implementação de cache inteligente
- Métricas e observabilidade
- Versionamento de APIs
- Documentação automática dos endpoints