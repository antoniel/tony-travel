# Banco de Memória do Domínio (LLM‑ready)

Este diretório reúne documentação não‑técnica do domínio da aplicação de viagens (Tony Travel) em Markdown, pensada para consumo por LLMs. O foco é clareza conceitual: termos, entidades, processos, regras, arquitetura conceitual e decisões — sem detalhes de implementação.

- Público‑alvo: agentes/LLMs e humanos buscando entendimento do domínio.
- Escopo: domínio de planejamento colaborativo de viagens, membros, convites, eventos, voos, acomodações e orçamento/finanças.
- Fora do escopo: endpoints, tipos/DB, componentes UI e código.

## Estrutura

- 00-visao-geral.md — visão geral, personas e limites.
- 01-vocabulario.md — glossário de termos canônicos e sinônimos.
- 02-entidades.md — entidades de domínio e relacionamentos.
- 03-processos.md — principais processos e fluxos de negócio.
- 04-regras-de-negocio.md — invariantes e políticas.
- 05-arquitetura-conceitual.md — módulos e fluxo de dados (alto nível).
- 06-decisoes.md — decisões e trade‑offs (ADR resumido).

Convenção de links:
- Usar links relativos entre arquivos para navegação cruzada.
- Cada arquivo traz “Veja também” e “Backreferences” para contexto bidirecional.

Sugestão de uso por LLM:
- Preferir termos do glossário (01-vocabulario.md) ao responder.
- Citar regras em 04-regras-de-negocio.md ao validar cenários.
- Para contexto de módulos, referenciar 05-arquitetura-conceitual.md e 06-decisoes.md.

Veja também: [00-visao-geral.md](./00-visao-geral.md), [01-vocabulario.md](./01-vocabulario.md)

Backreferences: index raiz
