# Processos e Fluxos de Negócio

Este documento descreve os principais processos do domínio, suas entradas/saídas e regras relevantes. Não inclui endpoints nem detalhes técnicos.

1) Criar Viagem
- Entrada: nome, destino, data início/fim, orçamento opcional, eventos e acomodações iniciais opcionais.
- Regra: datas devem ser válidas (início < fim; início não no passado).
- Saída: viagem criada com Owner definido para o criador.
- Efeitos: registro do membro (owner) criado junto.
Veja também: [business-rules.md](./business-rules.md)

2) Atualizar Configurações da Viagem
- Entrada: campos atualizáveis da Viagem (nome, destino, datas, orçamento…).
- Regra: somente Owner; se atualizar datas, validar novamente.
- Saída: viagem atualizada.

3) Excluir Viagem (Soft Delete)
- Entrada: id da viagem, confirmação pelo nome.
- Regras: somente Owner; se já excluída, bloquear repetição.
- Saída: viagem marcada como deletada (soft delete), com quem deletou.

4) Gerenciar Convites
- Criar link de convite: pode ter expiração; gera token único e URL.
- Aceitar convite: token válido e ativo; adiciona usuário como Member na Viagem.
- Remover membro: Owner pode remover; usuário deixa de ser Member.
- Regras: tokens inválidos/expirados não conferem acesso.

5) Planejar Eventos
- Criar/atualizar evento: título, período, tipo, custo/estimativa, local.
- Dependências: eventos podem referenciar um evento pai; custos totais incluem dependentes.
- Linha do tempo: eventos ordenados por período dentro da viagem.

6) Gerenciar Acomodações
- Entrada: período, endereço, preço, tipo (hotel/hostel/airbnb/resort/outros).
- Regras: período deve estar dentro (ou coerente com) a viagem.
- Saída: acomodação associada à viagem.

7) Gerenciar Voos
- Entrada: origem/destino (IATA ou grupos), datas/horários, custo.
- Participantes: associar membros ao voo quando aplicável.
- Saída: voo registrado e relacionamentos com participantes.

8) Resumo Financeiro e Orçamento
- Entrada: id da viagem (com dados já inseridos: eventos, voos, acomodações).
- Saída: orçamento (se definido), total de despesas, restante, utilização (%), categorias:
  - passagens: custos de voos;
  - acomodacoes: acomodações;
  - atracoes: eventos (custo ou estimativa).
- Regras: se custo real ausente, usar estimativa; somar dependências de eventos.

Notas:
- Moeda padrão: BRL; apresentar formatação pt‑BR externamente, armazenar como número.
- Estimativas não confirmadas devem ser tratadas como tais — não confundir com custo real.

Veja também: [entities.md](./entities.md), [business-rules.md](./business-rules.md), [concierge.md](./concierge.md)

Backreferences: [vocabulary.md](./vocabulary.md), [decisions.md](./decisions.md)