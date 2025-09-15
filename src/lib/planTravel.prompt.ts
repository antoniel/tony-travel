type Airport = {
  code: string
  name: string
  city: string
  state: string | null
  stateCode: string | null
  country: string
  countryCode: string
  type: "airport" | "city_group" | "state_group" | "country_group"
  airportCount?: number
  airportCodes?: string[]
}

type StartPlanTravelProps = {
  tripDates: {
    start: string
    end: string
  }
  budget: {
    perPerson: number
    currency: string
  }
  destination: string
  groupSize: number
  departureAirports: Airport[]
  schemaOverride?: string
}
export function startPlanTravel({
  tripDates,
  budget,
  destination,
  groupSize,
  departureAirports,
}: StartPlanTravelProps) {
  // Create enhanced departure airports information with city, state/country details
  const departureAirportsInfo = departureAirports.map((airport) => ({
    code: airport.code,
    name: airport.name,
    city: airport.city,
    state: airport.state,
    stateCode: airport.stateCode,
    country: airport.country,
    countryCode: airport.countryCode,
    type: airport.type,
    displayName:
      airport.type === "city_group"
        ? `${airport.city} - ${airport.stateCode}`
        : airport.type === "state_group"
          ? airport.state
          : airport.type === "country_group"
            ? airport.country
            : `${airport.city} - ${airport.code}`,
  }))

  const inputsJson = {
    TRIP_DATES: tripDates,
    BUDGET: budget,
    DESTINATION: destination,
    GROUP_SIZE: groupSize,
    DEPARTURE_AIRPORTS: departureAirportsInfo,
  }

  return `
  <Task>
Atuar como um “Travel Planner” para um grupo brasileiro aventureiro que prioriza experiências sobre conforto, com foco em UM ÚNICO DESTINO-ALVO. O objetivo é gerar APENAS um objeto estruturado de roteiro. O assistente deve:
1) Analisar **voos multi-origem** (múltiplas cidades de saída no Brasil) para o **destino-alvo**, calcular **média de custo** por origem, sugerir **janelas flexíveis** e aplicar **equalização de custos de voo** (quem paga mais recebe crédito de hospedagem).
2) Confirmar que o **destino-alvo** oferece as atividades requeridas (trilha, água/praia/laguna/rápidos, adrenalina como parapente/tirolesa/MTB/canyoning), com **preços reais** e **descontos de grupo**, e uma logística simples.
3) Alocar orçamento com foco em aventura: **Atividades 60%**, **Comida 20%**, **Hospedagem 15%**, **Contingência 5%**, e **reserva extra de 15%** para emergências (grupo aventureiro).
4) Planejar **logística flexível** (chegadas escalonadas, ponto de encontro, SIM local/WhatsApp, transporte até atividades).
5) Aba “segurança & prático”: gestão de dinheiro (cartões x cash), seguro viagem com coberturas para esportes, timeline de compra de voos/atividades e apps/plataformas úteis.
6) ENTREGAR APENAS um **OUTPUT ESTRUTURADO** seguindo o schema 'Travel', 'Accommodation', 'VisaInfo' e 'AppEvent' (incluindo **café da manhã, almoço e jantar** todos os dias e **dependencies** para deslocamentos) — no formato JSON.
7) Escrever **todas as cifras em R$ (BRL)**; usar valores realistas quando faltar fonte.
</Task>


<Inputs>
${JSON.stringify(inputsJson, null, 2)}
</Inputs>


<Instructions Structure>
1) Role & idioma (pt-BR). Escopo: UM destino-alvo.
2) Variáveis: TRIP_DATES, BUDGET, DESTINATION, GROUP_SIZE, DEPARTURE_CITIES
3) Validar entradas; se faltar algo, assumir valores plausíveis e prosseguir.
4) Converter valores para BRL; refletir custos em \`estimatedCost\` de eventos e, quando apropriado, em \`accommodation.price\`.
5) Produzir APENAS o objeto 'Travel' completo (JSON) conforme schema, cobrindo todo o período com 3 refeições/dia e dependencies de deslocamento.
6) Garantir que o total estimado por pessoa ≤ BUDGET.perPerson; se exceder, ajustar escolhas (hostel/atividades) internamente no plano.
7) Formato de resposta: ver seção “Formato da Resposta (Obrigatório)”.
</Instructions Structure>


<Instructions>
Você será um planejador de viagem para um grupo brasileiro aventureiro. Quando eu escrever **BEGIN PLANNING**, siga estas regras.


Entradas
<trip_dates>
${tripDates.start} - ${tripDates.end}
</trip_dates>

${budget.perPerson} ${budget.currency}

<group_size>
${groupSize}
</group_size>

<destination>
${destination}
</destination>

<departure_airports>
${departureAirportsInfo.map((a) => `${a.displayName} (${a.code})`).join(", ")}
</departure_airports>

Regras gerais
	•	Idioma: português (Brasil).
	•	Não peça confirmação se as entradas já existirem; tome decisões prudentes e documente suposições.
	•	Todas as cifras em R$ (BRL). Se não for fornecido câmbio, use taxa média do dia e informe a fonte/assunção.
	•	Prioridade: experiências > conforto. Hospedagem = lugar para dormir/guardar bagagem.
	•	Orçamento on-ground por dia: Atividades 60%, Comida 20%, Hospedagem 15%, Contingência 5%
	•	Equalização de voos: calcule o custo médio RT do grupo para o destino-alvo (média das cidades de saída).
	•	Logística: prever chegadas escalonadas, transporte a atividades (metrô/ônibus/van).
	•	Validação das atividades: o destino-alvo deve cumprir todas as atividades requeridas (trilha/trekking; água: mar/laguna/rápidos; adrenalina: parapente/tirolesa/MTB/canyoning). Traga preços reais com faixas e aponte descontos de grupo quando existirem.

Schema (padrão)
Use estes tipos se não houver schema_override:

${schema}

Formato da Resposta (Obrigatório)
	•	Responda EXCLUSIVAMENTE com UM ÚNICO bloco de código markdown anotado como \`json\`.
	•	Dentro do bloco deve existir APENAS o objeto 'Travel' completo, seguindo exatamente o schema abaixo.
	•	Sem texto fora do bloco, sem comentários, sem múltiplos blocos.
	•	Datas como strings ISO 8601 (ex.: "2026-01-10T08:00:00-05:00"). Valores monetários em BRL.

Cálculos & verificações
	•	Converter tudo para R$; use taxa média atual para conversões.
	•	Checar que o Total estimado por pessoa (voo médio + on-ground + reserva 15% + deslocamentos internos) ≤ budget.perPerson.
	•	Se exceder, ajuste escolhas (ex.: hostel mais barato, atividade alternativa, ajuste de dias) e recalcule o total.
	•	Assumir valores plausíveis internamente quando necessário.

Estilo
	•	Objetivo e direto.
	•	Não inclua nenhum texto fora do bloco \`json\` exigido.

Início
BEGIN PLANNING

`
}

const schema = `
type Travel = {
	destination: string;
	name: string;
	startDate: Date;
	endDate: Date;
	id?: string | undefined;
	createdAt?: Date | undefined;
	updatedAt?: Date | undefined;
	accommodations: {
		name: string;
		type: "hotel" | "hostel" | "airbnb" | "resort" | "other";
		startDate: Date;
		endDate: Date;
		travelId: string;
		address?: string | null | undefined;
		rating?: number | null | undefined;
		price?: number | null | undefined;
		currency?: string | null | undefined;
		id?: string | undefined;
		createdAt?: Date | undefined;
		updatedAt?: Date | undefined;
	}[];
	events: {
		startDate: Date;
		endDate: Date;
		type: "travel" | "food" | "activity";
		travelId: string;
		title: string;
		id: string | undefined;
		createdAt: Date | undefined;
		updatedAt: Date | undefined;
		estimatedCost: number | null | undefined;
		location: string | null | undefined;
		imageUrl?: string | null | undefined;
        imageMetadata?:
            | {
                    source: "manual";
                    tags: string[];
                    photographer?: string;
                    fetchedAt: Date;
              }
			| null
			| undefined;
		parentEventId: string | null | undefined;
	}[];
};
`
