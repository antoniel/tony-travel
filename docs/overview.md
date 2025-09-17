# Visão Geral do Domínio

Objetivo: permitir que pessoas planejem viagens de forma colaborativa, estruturando eventos, voos, acomodações e orçamento, com convites e papéis de acesso claros.

Valor principal:
- Centralizar planejamento de viagem (datas, destino, timeline de eventos).
- Colaboração entre membros convidados por link.
- Visão financeira: orçamento, custos por categoria e utilização.

Personas:
- Dono da Viagem (owner): cria, configura, convida, atualiza e pode excluir a viagem.
- Membro (member): participa da viagem, colabora com eventos e informações.
- Convidado (via link): aceita convite para tornar‑se membro.

Limites e fora do escopo (domínio):
- Não realiza reservas/pagamentos externos; registra informações e custos.
- Não define regras fiscais/contábeis além de categorias e somatórios.
- Foco em BRL por padrão; outras moedas podem aparecer futuramente.

Mapa rápido do domínio:
- Viagem agrega: Eventos (com dependências), Voos (com participantes), Acomodações e Membros.
- Convite controla entrada de novos membros por token e expiração.
- Financeiro resume orçamento e despesas por categorias.

Veja também: [vocabulary.md](./vocabulary.md), [entities.md](./entities.md), [architecture.md](./architecture.md), [business-rules.md](./business-rules.md)

Backreferences: [concierge.md](./concierge.md), [processes.md](./processes.md)