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

Notas de normalização:

- Moeda padrão: BRL (pt-BR). Valores exibidos com máscara/formatador, mas armazenados como número.
- IDs são strings com prefixos tipados (e.g., "trv*", "evt*", "acm\_"), mas tratar como opaco.

Veja também: [02-entidades.md](./02-entidades.md), [04-regras-de-negocio.md](./04-regras-de-negocio.md)

Backreferences: [00-visao-geral.md](./00-visao-geral.md), [03-processos.md](./03-processos.md)
