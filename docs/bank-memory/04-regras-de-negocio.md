# Regras de Negócio (Invariantes e Políticas)

Viagem
- Datas válidas: início < fim; início não pode estar no passado (mesmo dia permitido a partir de 00:00).
- Soft delete: exclusão marca `deletedAt` e `deletedBy`, sem remoção física imediata.
- Atualização/Exclusão: somente Owner; exclusão exige confirmação pelo nome exato da viagem.

Acesso e Papéis
- Owner: pode criar convites, atualizar e excluir viagem, gerenciar membros.
- Member: participa e colabora, mas não altera configurações restritas do Owner.
- Usuário não‑membro: não autorizado a acessar dados da viagem.

Convites
- Token único por convite; `isActive` controla validade; `expiresAt` opcional.
- Convite expirado ou inativo não concede acesso; aceitar convite converte em Membership.

Eventos
- Podem possuir dependências (pai/filho); custo total do evento inclui dependências recursivamente.
- Período do evento deve ser coerente com o período da viagem.
- Tipagem conceitual: "travel", "food", "activity"; custo real opcional; estimativa como fallback.

Acomodações
- Devem referir-se a período (check‑in/out) e preço; coerência temporal com a viagem.

Voos
- Origem/destino obrigatórios; datas/horários consistentes; custo opcional.
- Participantes de voo referenciam usuários membros da viagem.

Financeiro
- Orçamento (se definido) deve ser positivo.
- Resumo financeiro categoriza despesas: passagens (voos), acomodacoes (hospedagens), atracoes (eventos).
- Utilização do orçamento e restante são derivados; se orçamento ausente, alguns indicadores tornam‑se nulos.
- Custos de eventos usam custo real quando presente; caso contrário, estimativa.

Identificadores e Moeda
- IDs são opacos com prefixos tipados (ex.: `trv_`, `evt_`, `acm_`, `flt_`).
- Padrão de moeda: BRL com formatação `pt-BR` em exibição; armazenar valores como números.

Veja também: [03-processos.md](./03-processos.md), [05-arquitetura-conceitual.md](./05-arquitetura-conceitual.md)

Backreferences: [01-vocabulario.md](./01-vocabulario.md), [02-entidades.md](./02-entidades.md)
