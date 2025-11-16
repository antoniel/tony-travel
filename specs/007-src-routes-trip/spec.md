# Feature Specification: Visualização de Voos por Pessoa

**Feature Branch**: `007-src-routes-trip`  
**Created**: January 2025  
**Status**: Draft  
**Input**: User description: "src/routes/trip/$travelId/flights/index.tsx - eu quero uma visualização de voos por pessoa além da visualização por cidade de partida - algo próximo de uma tabela pra ficar fácil de analisar as coisas"

## Clarifications

### Session 2025-01-27

- Q: Qual formato de tabela você prefere? → A: Uma linha por pessoa com voos expandáveis/colapsáveis (tipo accordion)
- Q: Como devem aparecer voos com múltiplos trechos na tabela por pessoa? → A: O voo completo aparece como uma única linha com indicação visual de múltiplos trechos (expandível para detalhes)
- Q: Como devem iniciar as seções de pessoa na visualização por pessoa? → A: Todas colapsadas por padrão (usuário expande conforme necessário)
- Q: O que deve aparecer na linha colapsada de cada pessoa? → A: Nome, contagem de voos e resumo de rotas (atualizado: incluir também custo total quando disponível, pois preço é muito importante)
- Q: Como devem ser ordenadas as pessoas na tabela? → A: Por data do primeiro voo (mais recente primeiro)
- Q: Qual a importância da informação de preço na visualização? → A: Muito importante - deve ser destacada e facilmente visível

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Alternar entre Visualizações (Priority: P1)

Como usuário da página de voos, quero alternar entre visualização por cidade de partida e visualização por pessoa, para analisar os voos de diferentes perspectivas conforme minha necessidade.

**Why this priority**: Esta é a funcionalidade central que permite acesso à nova visualização. Sem ela, a visualização por pessoa não pode ser acessada.

**Independent Test**: Pode ser totalmente testado alternando entre as duas visualizações e verificando que ambas funcionam corretamente, entregando valor imediato ao usuário.

**Acceptance Scenarios**:

1. **Given** o usuário está na página de voos, **When** ele seleciona a visualização por pessoa, **Then** a interface deve mostrar uma tabela agrupada por pessoa com todos os voos de cada participante
2. **Given** o usuário está na visualização por pessoa, **When** ele alterna para visualização por cidade, **Then** a interface deve retornar à visualização original agrupada por cidade de partida
3. **Given** o usuário alterna entre visualizações, **When** ele faz a transição, **Then** os dados devem ser preservados e a interface deve responder rapidamente (sem recarregar a página)

---

### User Story 2 - Visualizar Voos Agrupados por Pessoa em Formato de Tabela (Priority: P1)

Como usuário da página de voos, quero ver uma tabela onde cada pessoa tem seus voos listados de forma organizada, para facilitar a análise de itinerários individuais e identificar padrões por pessoa.

**Why this priority**: Esta é a funcionalidade principal solicitada - a visualização tabular por pessoa que facilita análise.

**Independent Test**: Pode ser testado verificando que a tabela mostra corretamente os voos agrupados por pessoa, com todas as informações relevantes visíveis e organizadas.

**Acceptance Scenarios**:

1. **Given** existem voos cadastrados com participantes, **When** o usuário seleciona visualização por pessoa, **Then** deve aparecer uma tabela com linhas expansíveis por pessoa (inicialmente colapsadas), que ao serem expandidas mostram todos os voos daquela pessoa
2. **Given** uma pessoa tem múltiplos voos, **When** o usuário visualiza a tabela por pessoa, **Then** todos os voos dessa pessoa devem estar agrupados sob seu nome, ordenados cronologicamente
3. **Given** um voo tem múltiplos participantes, **When** o usuário visualiza por pessoa, **Then** esse voo deve aparecer na linha de cada participante envolvido
4. **Given** a tabela está sendo exibida, **When** o usuário visualiza as informações, **Then** deve ser possível ver facilmente: nome da pessoa, rota do voo, datas/horários de partida e chegada, custo destacado, e outras informações relevantes. O custo deve ser claramente visível e destacado

---

### User Story 3 - Lidar com Voos sem Participantes (Priority: P2)

Como usuário da página de voos, quero ver voos que não têm participantes atribuídos de forma clara na visualização por pessoa, para identificar voos que precisam ter participantes adicionados.

**Why this priority**: Importante para completude da visualização, mas não é o caso principal de uso. Pode ser tratado como seção separada ou indicador visual.

**Independent Test**: Pode ser testado verificando que voos sem participantes aparecem de forma identificável (seção separada ou marcados claramente) na visualização por pessoa.

**Acceptance Scenarios**:

1. **Given** existem voos sem participantes atribuídos, **When** o usuário visualiza por pessoa, **Then** esses voos devem aparecer em uma seção separada ou claramente marcados como "Voos sem participantes"
2. **Given** um voo sem participantes está visível, **When** o usuário interage com ele, **Then** deve ser possível identificar facilmente que esse voo precisa ter participantes adicionados

---

### Edge Cases

- O que acontece quando uma pessoa não tem nenhum voo atribuído?
  - A pessoa não deve aparecer na visualização por pessoa, ou deve aparecer com indicador de "sem voos"
- Como o sistema lida com voos que têm muitos participantes (ex: 10+ pessoas)?
  - A tabela deve ser scrollável e permitir visualização de todas as linhas, possivelmente com paginação se necessário
- O que acontece quando não há voos cadastrados?
  - Deve mostrar o estado vazio apropriado, similar à visualização por cidade
- Como são tratados voos com múltiplos trechos (multi-slice)?
  - O voo completo aparece como uma única linha na tabela com indicação visual de múltiplos trechos, expandível para mostrar detalhes de cada trecho quando necessário
- O que acontece quando uma pessoa tem voos em diferentes moedas?
  - A tabela deve mostrar os valores em suas moedas originais, possivelmente com conversão ou agrupamento por moeda

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE permitir alternar entre visualização por cidade de partida e visualização por pessoa através de um controle de interface (botão, toggle, ou seletor)
- **FR-002**: Sistema DEVE exibir voos agrupados por pessoa em formato de tabela quando a visualização por pessoa estiver ativa
- **FR-003**: Sistema DEVE mostrar cada pessoa como uma linha expansível/colapsável (accordion) na tabela, com seus voos listados como linhas expandidas quando a seção da pessoa estiver aberta. As seções devem iniciar colapsadas por padrão, mostrando na linha colapsada: nome da pessoa, contagem de voos, resumo de rotas e custo total (quando disponível). O custo total deve ser destacado (ex: "João Silva - 3 voos: GRU→JFK, JFK→LHR | Total: R$ 5.400,00")
- **FR-013**: Sistema DEVE exibir informações de preço de forma destacada e facilmente visível na visualização por pessoa, tanto na linha colapsada (quando aplicável) quanto nas linhas expandidas de cada voo
- **FR-004**: Sistema DEVE exibir para cada voo na tabela: nome da pessoa, rota completa (origem → destino), data e horário de partida, data e horário de chegada, custo destacado (se disponível), e número de participantes. O custo DEVE ser exibido de forma proeminente e facilmente identificável
- **FR-011**: Sistema DEVE exibir voos com múltiplos trechos como uma única linha com indicação visual de múltiplos trechos, permitindo expansão para mostrar detalhes de cada trecho
- **FR-005**: Sistema DEVE permitir que voos com múltiplos participantes apareçam na linha de cada participante envolvido
- **FR-006**: Sistema DEVE ordenar voos cronologicamente dentro de cada grupo de pessoa (por data/hora de partida)
- **FR-012**: Sistema DEVE ordenar as pessoas na tabela por data do primeiro voo, com voos mais recentes aparecendo primeiro
- **FR-007**: Sistema DEVE tratar voos sem participantes de forma identificável (seção separada ou indicador visual claro)
- **FR-008**: Sistema DEVE preservar todas as funcionalidades existentes da visualização por cidade (editar, deletar, adicionar voos) na visualização por pessoa
- **FR-009**: Sistema DEVE permitir interação com voos na visualização por pessoa (editar, deletar) da mesma forma que na visualização por cidade
- **FR-010**: Sistema DEVE manter a performance da página mesmo com muitos voos e participantes na visualização por pessoa

### Key Entities

- **Pessoa/Participante**: Representa um membro da viagem que pode ter voos atribuídos. Atributos: nome, identificador, avatar (opcional)
- **Voo**: Representa um voo com seus atributos principais. Atributos: rota (origem/destino), datas/horários, custo, participantes, trechos
- **Grupo de Voos por Pessoa**: Agrupamento de voos onde a chave de agrupamento é a pessoa/participante

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem alternar entre visualizações em menos de 1 segundo sem recarregar a página
- **SC-002**: Usuários conseguem identificar todos os voos de uma pessoa específica em menos de 5 segundos na visualização por pessoa
- **SC-003**: A tabela por pessoa exibe corretamente pelo menos 50 voos com múltiplos participantes sem degradação de performance perceptível
- **SC-004**: 90% dos usuários conseguem encontrar informações específicas de voo (rota, datas, custo destacado) na visualização por pessoa na primeira tentativa. O custo deve ser identificável em menos de 2 segundos
- **SC-005**: A visualização por pessoa mantém todas as funcionalidades de edição e exclusão disponíveis na visualização por cidade, com taxa de sucesso de 100% nas operações

## Assumptions

- A visualização por pessoa será uma alternativa à visualização por cidade, não uma substituição
- Voos com múltiplos participantes aparecerão uma vez para cada participante (cada pessoa vê seus próprios voos)
- A tabela será responsiva e funcionará bem em dispositivos móveis e desktop
- A ordenação padrão será cronológica (por data/hora de partida) dentro de cada grupo de pessoa
- Voos sem participantes serão tratados de forma separada ou claramente marcados, mas não impedirão o uso da visualização
- Todas as ações disponíveis na visualização por cidade (editar, deletar) estarão disponíveis na visualização por pessoa

## Out of Scope

- Exportação da tabela para CSV/Excel
- Filtros avançados na visualização por pessoa (por data, custo, etc.) - pode ser considerado em iterações futuras
- Comparação lado a lado entre visualizações
- Estatísticas agregadas por pessoa (total gasto, número de voos) - pode ser considerado em iterações futuras
- Edição em lote de participantes de voos diretamente da tabela
