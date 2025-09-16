# Arquitetura Conceitual (alto nível)

Objetivo: descrever como o domínio é organizado em módulos e como os dados fluem na aplicação — sem detalhes de implementação.

Módulos de domínio (oRPC):
- travel — viagem, membros, permissões e ciclo de vida.
- event — eventos e dependências.
- accommodation — hospedagens.
- flight — voos e participantes.
- financial — orçamento e resumo de despesas.
- invitation — convites por token e aceitação.

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

Observações para LLM
- Ao descrever comportamento do sistema, preferir os termos do glossário e as regras deste banco de memória, não os nomes de arquivos.
- Quando necessário, referenciar módulo conceitual (ex.: “módulo invitation”) e não detalhes de tipos/DB.

Veja também: [06-decisoes.md](./06-decisoes.md), [04-regras-de-negocio.md](./04-regras-de-negocio.md)

Backreferences: [00-visao-geral.md](./00-visao-geral.md), [02-entidades.md](./02-entidades.md)
