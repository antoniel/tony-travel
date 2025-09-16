# Decisões de Arquitetura (ADR resumido)

1) oRPC + TanStack Query para integração de dados
- Contexto: evitar acoplamento a endpoints REST e controlar cache/invalidações com clareza.
- Decisão: usar oRPC no backend e TanStack Query no frontend (sem fetch/axios diretos).
- Consequências: contratos explícitos por procedimento; melhor testabilidade por módulo.
- Quando reconsiderar: se surgirem requisitos de streaming/real‑time extensos.

2) Zod + Drizzle ORM como fonte de verdade de tipos/validação
- Contexto: manter tipos e validação consistentes do domínio.
- Decisão: schemas centralizados e coerção via Zod; persistência Drizzle.
- Consequências: menor desvio entre validação e armazenamento; onboarding previsível.
- Quando reconsiderar: se houver migração para um banco não relacional.

3) Identificadores com nanoid base58 e prefixos tipados
- Contexto: legibilidade e rastreabilidade por tipo de entidade.
- Decisão: prefixes (`usr_`, `trv_`, `evt_`, `acm_`, `flt_`, `trm_`, `inv_`).
- Consequências: debugging e logs mais claros; IDs opacos mantidos.
- Quando reconsiderar: interoperabilidade com sistemas que exigem UUID v4.

4) Moeda padrão BRL e apresentação pt‑BR
- Contexto: foco inicial em Brasil; consistência de exibição.
- Decisão: armazenar números; formatar BRL (pt‑BR) na UI.
- Consequências: métricas financeiras padronizadas; necessidade de internacionalização futura.
- Quando reconsiderar: suporte multi‑moeda com conversão.

5) Soft delete para Viagem
- Contexto: preservar histórico e evitar perdas acidentais.
- Decisão: marcar `deletedAt` e `deletedBy`; exigir confirmação por nome.
- Consequências: recuperação potencial; regras claras de exclusão.
- Quando reconsiderar: requisitos de GDPR/retention diferentes.

6) Eventos com dependências e custo total recursivo
- Contexto: atividades compostas (ex.: passeio + ingressos + transporte).
- Decisão: permitir `parentEventId`; total = custo/estimativa + dependências.
- Consequências: visão financeira fiel; UI de timeline composta.
- Quando reconsiderar: se granularidade de custo migrar para itens financeiros separados.

7) Convites por token com expiração opcional
- Contexto: entrada simples de novos membros.
- Decisão: token único, `isActive` e `expiresAt` controlam validade.
- Consequências: segurança adequada para uso compartilhável; controle de revogação.
- Quando reconsiderar: SSO/org‑based access.

8) Papéis Owner/Member e autorização por viagem
- Contexto: governança simples por viagem.
- Decisão: Owner para ações administrativas; Member para colaboração.
- Consequências: regras de permissão claras e auditáveis.
- Quando reconsiderar: papéis adicionais (ex.: editor/leitor) ou políticas baseadas em atributos.

Veja também: [05-arquitetura-conceitual.md](./05-arquitetura-conceitual.md), [04-regras-de-negocio.md](./04-regras-de-negocio.md)

Backreferences: [03-processos.md](./03-processos.md), [00-visao-geral.md](./00-visao-geral.md)
