# Arquitetura Conceitual (alto nível)

Objetivo: descrever como o domínio é organizado em módulos e como os dados fluem na aplicação — sem detalhes de implementação.

Módulos de domínio (oRPC):
- travel — viagem, membros, permissões e ciclo de vida.
- event — eventos e dependências.
- accommodation — hospedagens.
- flight — voos e participantes.
- financial — orçamento e resumo de despesas.
- invitation — convites por token e aceitação.
- concierge — assistente AI com tool calls e sugestões contextuais.

Fluxo de dados (conceitual):
- Frontend consulta/atualiza via oRPC, orquestrado por TanStack Query (cache/invalidations) — sem uso de fetch/axios diretos.
- Schemas e validação de dados com Zod; persistência com Drizzle ORM e banco SQLite local em dev.
- Erros de serviço retornam `AppResult<T>`; rotas levantam `AppError` conforme contrato.
- Identificadores gerados com nanoid base58 e prefixos tipados (e.g., `trv_`, `evt_`).

Alinhamentos de domínio
- Regras (datas, papéis, soft delete, custos/estimativas) aplicadas em serviços/domínio.
- Resumo financeiro agrega dados de eventos/voos/acomodações em categorias.

Dependências externas (conceito):
- UI (shadcn/ui + Tailwind v4) e TanStack Router para rotas por arquivo.
- Integrações de autenticação e ambiente via T3 Env (validação de variáveis).
- AI (Vercel AI SDK v5) para tool calling e streaming de respostas com human-in-the-loop.

Observações para LLM
- Ao descrever comportamento do sistema, preferir os termos do glossário e as regras desta documentação, não os nomes de arquivos.
- Quando necessário, referenciar módulo conceitual (ex.: "módulo invitation") e não detalhes de tipos/DB.

Veja também: [decisions.md](./decisions.md), [business-rules.md](./business-rules.md), [vocabulary.md](./vocabulary.md), [concierge.md](./concierge.md)

Backreferences: [overview.md](./overview.md), [entities.md](./entities.md)