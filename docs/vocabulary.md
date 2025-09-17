# Vocabulário do Domínio (Glossário)

Termos canônicos preferidos para respostas e raciocínio de LLM. Sinônimos listados para reconhecimento, mas não preferidos na redação final.

- Viagem (Travel): entidade raiz que reúne planejamento.
  - Sinônimos: projeto de viagem, plano de viagem.
- Dono da viagem (Owner): usuário com permissão total sobre a viagem.
  - Sinônimos: proprietário, organizador principal.
- Membro (Member): usuário participante da viagem com acesso colaborativo.
- Convite (Invitation): token/link para ingresso de novos membros.
  - Atributos: ativo/inválido, expiração opcional.
- Evento (Event): item na linha do tempo da viagem.
  - Tipos: "travel", "food", "activity".
  - Pode ter dependências (eventos filhos). Custos: real e/ou estimado.
- Acomodação (Accommodation): hospedagem com período, endereço e preço .
- Voo (Flight): deslocamento com origem/destino, datas/horários e custo.
- Participante de Voo (FlightParticipant): membro associado a um voo.
- Orçamento (Budget): valor planejado para a viagem (BRL por padrão).
- Despesa (Expense): custo agregado a eventos, voos e acomodações.
- Categoria de Despesa: "passagens", "acomodacoes", "atracoes".
- Linha do Tempo (Timeline): sequência cronológica de eventos na viagem.
- Dependência de Evento: relação pai/filho entre eventos que compõem um custo e/ou sequência lógica.
- Concierge: assistente AI que sugere ações através de tool calls com confirmação humana.
  - Sinônimos: assistente virtual, AI agent.
- Tool Call: sugestão de ação específica gerada pela AI com parâmetros estruturados.
  - Estados: pendente (aguarda confirmação), confirmado, rejeitado.
- Human-in-the-Loop: padrão onde AI sugere mas humano decide e executa.
  - Sinônimos: confirmação humana, validação manual.
- AI Agêntico: comportamento de AI que sugere ações estruturadas sem execução automática.
  - Antônimo: AI automática, AI executiva.

Notas de normalização:

- Moeda padrão: BRL (pt-BR). Valores exibidos com máscara/formatador, mas armazenados como número.
- IDs são strings com prefixos tipados (e.g., "trv*", "evt*", "acm\_"), mas tratar como opaco.

Veja também: [entities.md](./entities.md), [business-rules.md](./business-rules.md), [architecture.md](./architecture.md), [concierge.md](./concierge.md)

Backreferences: [overview.md](./overview.md), [processes.md](./processes.md), [decisions.md](./decisions.md)