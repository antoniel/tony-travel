import type { DB } from "@/lib/db/types";
import { AppResult } from "@/orpc/appResult";
import type { Tool } from "ai";
import { z } from "zod";
import { createAccommodationDAO } from "../accommodation/accommodation.dao";
import { createEventDAO } from "../event/event.dao";
import { getEventsByTravelService } from "../event/event.service";
import type { FlightDAO } from "../flight/flight.dao";
import { createFlightDAO } from "../flight/flight.dao";
import type { UpsertFlightPayload } from "../flight/flight.model";
import {
	createFlightService,
	deleteFlightService,
	getFlightsByTravelService,
	updateFlightService,
} from "../flight/flight.service";
import { createTravelDAO } from "../travel/travel.dao";
import type { TripContext } from "./CONCIERGE_SYSTEM_PROMPT";

interface AppTool extends Pick<Tool, "description" | "execute"> {
	db: DB;
	travelContext: TripContext;
	inputSchema: Tool["inputSchema"];
	outputSchema?: Tool["outputSchema"];
}

const isoDateTimeString = z
	.string()
	.min(1)
	.describe("Data e hora no formato ISO 8601, incluindo timezone")
	.refine((value) => !Number.isNaN(Date.parse(value)), {
		message: "Forneça uma data/hora ISO válida, ex: 2025-09-15T10:30:00-03:00",
	});

const flightSegmentToolSchema = z.object({
	originAirport: z
		.string()
		.min(1)
		.describe("Código IATA do aeroporto de origem (ex: GRU, JFK)"),
	destinationAirport: z
		.string()
		.min(1)
		.describe("Código IATA do aeroporto de destino"),
	departure: isoDateTimeString.describe(
		"Data e hora de partida do segmento (ex: 2025-09-18T08:00:00-03:00)",
	),
	arrival: isoDateTimeString.describe(
		"Data e hora de chegada do segmento (ex: 2025-09-18T12:30:00-03:00)",
	),
	marketingFlightNumber: z
		.string()
		.optional()
		.describe("Número do voo comercial (ex: 3456)"),
	operatingCarrierCode: z
		.string()
		.optional()
		.describe("Código da companhia operadora, se diferente"),
	aircraftName: z
		.string()
		.optional()
		.describe("Nome da aeronave (ex: Airbus A320)"),
	aircraftType: z.string().optional().describe("Modelo da aeronave (ex: A320)"),
	distanceMeters: z
		.number()
		.nonnegative()
		.optional()
		.describe("Distância estimada em metros"),
	durationMinutes: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe("Duração do trecho em minutos"),
});

const flightSliceToolSchema = z.object({
	originAirport: z
		.string()
		.optional()
		.describe(
			"Código IATA da origem do slice (opcional, inferido pelo primeiro trecho)",
		),
	destinationAirport: z
		.string()
		.optional()
		.describe(
			"Código IATA do destino do slice (opcional, inferido pelo último trecho)",
		),
	segments: z
		.array(flightSegmentToolSchema)
		.min(1)
		.describe("Lista de trechos que compõem a rota"),
	cabinClass: z
		.string()
		.optional()
		.describe("Classe de cabine (ex: economy, business)"),
	cabinClassMarketingName: z
		.string()
		.optional()
		.describe("Nome comercial da cabine"),
	durationMinutes: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe("Duração total da rota em minutos"),
});

const flightCostSchema = z.object({
	totalAmount: z
		.number()
		.nonnegative()
		.optional()
		.describe("Valor total do voo na moeda indicada"),
	currency: z
		.string()
		.length(3)
		.optional()
		.describe("Código da moeda em formato ISO (ex: BRL, USD)"),
	baseAmount: z
		.number()
		.nonnegative()
		.optional()
		.describe("Valor base sem taxas"),
	taxAmount: z.number().nonnegative().optional().describe("Total de taxas"),
	provider: z.string().optional().describe("Fornecedor ou OTA"),
	offerReference: z.string().optional().describe("Referência da oferta"),
	dataSource: z.string().optional().describe("Origem dos dados"),
	metadata: z
		.record(z.string(), z.unknown())
		.optional()
		.describe("Metadados adicionais"),
});

export class RequestToCreateEventTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}
	description =
		"Criar um evento para a viagem do usuário (atividade, refeição ou transporte)";
	inputSchema = z.object({
		title: z
			.string()
			.describe(
				"Título do evento (ex: 'Jantar no restaurante', 'Visita ao museu')",
			),
		startDate: z
			.string()
			.describe(
				"Data e hora de início no formato ISO 8601 (ex: '2024-03-15T19:00:00')",
			),
		endDate: z
			.string()
			.describe(
				"Data e hora de fim no formato ISO 8601 (ex: '2024-03-15T21:00:00')",
			),
		type: z
			.enum(["travel", "food", "activity"])
			.describe(
				"Tipo do evento: travel (transporte), food (alimentação), activity (atividade)",
			),
		location: z
			.string()
			.optional()
			.describe(
				"Local do evento (ex: 'Restaurante ABC', 'Museu XYZ', 'Hotel')",
			),
		estimatedCost: z
			.number()
			.optional()
			.describe("Custo estimado em reais (ex: 150.50)"),
		description: z
			.string()
			.optional()
			.describe(
				"Descrição detalhada do evento (ex: 'Jantar romântico com vista para o mar')",
			),
		link: z
			.url({ message: "Link deve ser uma URL válida" })
			.optional()
			.describe(
				"Link relacionado ao evento (ex: 'https://restaurante.com', 'https://museu.com')",
			),
	});
	outputSchema = z.object({
		success: z.boolean(),
		events: z.array(
			z.object({
				eventId: z.string(),
			}),
		),
	});
}

export class RequestToCreateAccommodationTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}
	description =
		"Solicitar criação de uma nova acomodação para a viagem atual com todos os detalhes necessários";
	inputSchema = z.object({
		name: z
			.string()
			.describe("Nome ou título da acomodação (ex: 'Hotel Copacabana Palace')"),
		type: z
			.enum(["hotel", "hostel", "airbnb", "resort", "other"])
			.describe("Tipo da acomodação"),
		address: z
			.string()
			.describe("Endereço completo ou referência principal da acomodação"),
		startDate: z
			.string()
			.describe(
				"Data de check-in no formato ISO 8601 (ex: '2025-09-18T15:00:00')",
			),
		endDate: z
			.string()
			.describe(
				"Data de check-out no formato ISO 8601 (ex: '2025-09-20T11:00:00')",
			),
		price: z.number().describe("Custo estimado total em reais para a estadia"),
	});
	outputSchema = z.object({
		success: z.boolean(),
		accommodation: z
			.object({
				accommodationId: z
					.string()
					.describe("Identificador da acomodação criada"),
			})
			.optional(),
		message: z
			.string()
			.optional()
			.describe(
				"Mensagem de confirmação ou erro da ação executada pelo cliente",
			),
	});
}

export class RequestToUpdateAccommodationTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}
	description =
		"Solicitar atualização de uma acomodação existente, permitindo ajustar datas, preço ou detalhes";
	inputSchema = z.object({
		accommodationId: z
			.string()
			.describe("Identificador da acomodação a ser atualizada"),
		updates: z
			.object({
				name: z.string().optional().describe("Novo nome da acomodação"),
				type: z
					.enum(["hotel", "hostel", "airbnb", "resort", "other"])
					.optional()
					.describe("Novo tipo da acomodação"),
				address: z.string().optional().describe("Novo endereço ou referência"),
				startDate: z
					.string()
					.optional()
					.describe("Nova data de check-in em ISO 8601"),
				endDate: z
					.string()
					.optional()
					.describe("Nova data de check-out em ISO 8601"),
				price: z.number().optional().describe("Novo custo estimado em reais"),
			})
			.refine(
				(updates) =>
					Object.values(updates).some((value) => value !== undefined),
				{
					message: "Pelo menos um campo de atualização deve ser informado",
					path: ["updates"],
				},
			),
	});
	outputSchema = z.object({
		success: z.boolean(),
		accommodation: z
			.object({
				accommodationId: z.string(),
				updatedFields: z
					.array(z.string())
					.describe("Lista de campos atualizados pelo cliente"),
			})
			.optional(),
		validationError: z
			.string()
			.optional()
			.describe("Mensagem de erro retornada ao executar a atualização"),
	});
}

export class RequestToDeleteAccommodationTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}
	description =
		"Solicitar remoção de uma acomodação cadastrada quando ela não for mais necessária";
	inputSchema = z.object({
		accommodationId: z
			.string()
			.describe("Identificador da acomodação que deve ser removida"),
		reason: z
			.string()
			.optional()
			.describe(
				"Motivo da exclusão (ex: reserva cancelada, alteração de planos)",
			),
		confirm: z
			.boolean()
			.default(false)
			.describe("Confirma explicitamente que a acomodação pode ser removida"),
	});
	outputSchema = z.object({
		success: z.boolean(),
		message: z
			.string()
			.optional()
			.describe(
				"Mensagem informando o resultado da exclusão realizada pelo cliente",
			),
	});
}

export class RequestToCreateFlightTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}

	description =
		"Criar um voo completo (com rotas e conexões) para a viagem atual, incluindo participantes";

	inputSchema = flightCostSchema
		.extend({
			slices: z
				.array(flightSliceToolSchema)
				.min(1)
				.describe(
					"Rotas que compõem o voo. Cada rota pode conter múltiplos trechos (conexões)",
				),
			participantIds: z
				.array(z.string())
				.optional()
				.describe("Lista de IDs de usuários participantes do voo (opcional)"),
		})
		.describe(
			"Detalhes do voo: valores, rotas (slices) e participantes a bordo",
		);

	outputSchema = z.object({
		success: z.boolean(),
		flightId: z.string().optional(),
		message: z.string().optional(),
		slices: z.number().optional(),
		segments: z.number().optional(),
	});

	execute = async (
		input: z.TypeOf<typeof RequestToCreateFlightTool.prototype.inputSchema>,
	) => {
		const flightDAO = createFlightDAO(this.db);
		const travelDAO = createTravelDAO(this.db);

		try {
			const flightPayload = buildFlightPayloadFromToolInput(input);
			const result = await createFlightService(flightDAO, travelDAO, {
				travelId: this.travelContext.travelId,
				flight: flightPayload,
				participantIds: input.participantIds ?? [],
			});

			if (AppResult.isFailure(result)) {
				return {
					success: false,
					message: result.error.message,
				};
			}

			const totalSegments = flightPayload.slices.reduce(
				(sum, slice) => sum + slice.segments.length,
				0,
			);

			return {
				success: true,
				flightId: result.data.id,
				slices: flightPayload.slices.length,
				segments: totalSegments,
				message: "Voo criado com sucesso",
			};
		} catch (error) {
			return {
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Falha inesperada ao criar o voo",
			};
		}
	};
}

export class RequestToUpdateFlightTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}

	description =
		"Atualizar um voo existente substituindo suas rotas, horários e participantes";

	inputSchema = flightCostSchema
		.extend({
			flightId: z.string().describe("Identificador do voo que será atualizado"),
			slices: z
				.array(flightSliceToolSchema)
				.min(1)
				.describe("Nova configuração de rotas e trechos para o voo"),
			participantIds: z
				.array(z.string())
				.optional()
				.describe(
					"Lista completa de participantes desejada após a atualização",
				),
		})
		.describe("Dados atualizados para o voo");

	outputSchema = z.object({
		success: z.boolean(),
		message: z.string().optional(),
	});

	execute = async (
		input: z.TypeOf<typeof RequestToUpdateFlightTool.prototype.inputSchema>,
	) => {
		const flightDAO = createFlightDAO(this.db);

		try {
			const flightPayload = buildFlightPayloadFromToolInput(input);
			const result = await updateFlightService(flightDAO, {
				id: input.flightId,
				flight: flightPayload,
			});

			if (AppResult.isFailure(result)) {
				return {
					success: false,
					message: result.error.message,
				};
			}

			// Handle participant updates when provided
			if (input.participantIds) {
				await syncFlightParticipants(
					flightDAO,
					input.flightId,
					input.participantIds,
				);
			}

			return {
				success: true,
				message: "Voo atualizado com sucesso",
			};
		} catch (error) {
			return {
				success: false,
				message:
					error instanceof Error
						? error.message
						: "Falha inesperada ao atualizar o voo",
			};
		}
	};
}

export class RequestToDeleteFlightTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}

	description = "Remover um voo existente do planejamento da viagem";

	inputSchema = z.object({
		flightId: z.string().describe("Identificador do voo que deve ser removido"),
		reason: z
			.string()
			.optional()
			.describe("Motivo opcional para registro ou comunicação"),
	});

	outputSchema = z.object({
		success: z.boolean(),
		message: z.string().optional(),
	});

	execute = async (
		input: z.TypeOf<typeof RequestToDeleteFlightTool.prototype.inputSchema>,
	) => {
		const flightDAO = createFlightDAO(this.db);
		const result = await deleteFlightService(flightDAO, input.flightId);

		if (AppResult.isFailure(result)) {
			return {
				success: false,
				message: result.error.message,
			};
		}

		return {
			success: true,
			message: "Voo removido com sucesso",
		};
	};
}

export class ListFlightsTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}

	description =
		"Listar os voos cadastrados na viagem, com opção de detalhar rotas e participantes";

	inputSchema = z.object({
		granularity: z
			.enum(["summary", "detailed"])
			.default("summary")
			.describe(
				"Escolha 'summary' para visão geral ou 'detailed' para incluir rotas e participantes",
			),
	});

	outputSchema = z.object({
		success: z.boolean(),
		flights: z.array(z.record(z.string(), z.unknown())),
		count: z.number(),
		message: z.string().optional(),
	});

	execute = async (
		input: z.TypeOf<typeof ListFlightsTool.prototype.inputSchema>,
	) => {
		const flightDAO = createFlightDAO(this.db);
		const result = await getFlightsByTravelService(
			flightDAO,
			this.travelContext.travelId,
		);

		if (AppResult.isFailure(result)) {
			return {
				success: false,
				flights: [],
				count: 0,
				message: result.error.message,
			};
		}

		const flights = result.data
			.flatMap((group) =>
				group.flights.map((flight) => ({
					flight,
					groupOrigin: group.originAirport,
				})),
			)
			.map(({ flight, groupOrigin }) => {
				const firstSegment = flight.slices[0]?.segments[0];
				const lastSlice = flight.slices[flight.slices.length - 1];
				const lastSegment =
					lastSlice?.segments[lastSlice.segments.length - 1] ?? firstSegment;
				const totalSegments = flight.slices.reduce(
					(segmentSum, slice) => segmentSum + slice.segments.length,
					0,
				);
				if (input.granularity === "detailed") {
					return {
						id: flight.id,
						totalAmount: flight.totalAmount,
						currency: flight.currency,
						slices: flight.slices.map((slice) => ({
							originAirport: slice.originAirport,
							destinationAirport: slice.destinationAirport,
							durationMinutes: slice.durationMinutes,
							segments: slice.segments.map((segment) => ({
								originAirport: segment.originAirport,
								destinationAirport: segment.destinationAirport,
								departureDate: segment.departureDate.toISOString(),
								arrivalDate: segment.arrivalDate.toISOString(),
								marketingFlightNumber: segment.marketingFlightNumber,
								durationMinutes: segment.durationMinutes,
							})),
						})),
						participants: flight.participants.map((participant) => ({
							id: participant.user.id,
							name: participant.user.name,
						})),
						totalSegments,
					};
				}
				return {
					id: flight.id,
					originAirport: firstSegment?.originAirport ?? groupOrigin,
					destinationAirport:
						lastSegment?.destinationAirport ?? flight.destinationAirport,
					departureDate: firstSegment?.departureDate?.toISOString(),
					arrivalDate: lastSegment?.arrivalDate?.toISOString(),
					totalAmount: flight.totalAmount ?? null,
					currency: flight.currency ?? null,
					segments: totalSegments,
					participants: flight.participants.length,
				};
			});

		return {
			success: true,
			flights,
			count: flights.length,
			message:
				flights.length === 0
					? "Nenhum voo cadastrado para esta viagem"
					: `Encontrados ${flights.length} voo(s)`,
		};
	};
}

type FlightToolInput = z.infer<typeof flightCostSchema> & {
	slices: z.infer<typeof flightSliceToolSchema>[];
};

function buildFlightPayloadFromToolInput(
	input: FlightToolInput,
): UpsertFlightPayload {
	const slices = input.slices.map((slice) => {
		const parsedSegments = slice.segments.map(parseSegmentInput);
		const firstSegment = parsedSegments[0];
		const lastSegment =
			parsedSegments[parsedSegments.length - 1] ?? firstSegment;
		return {
			originAirport: firstSegment?.originAirport ?? slice.originAirport ?? "",
			destinationAirport:
				lastSegment?.destinationAirport ?? slice.destinationAirport ?? "",
			durationMinutes:
				slice.durationMinutes ?? calculateSliceDuration(parsedSegments),
			cabinClass: toOptionalString(slice.cabinClass),
			cabinClassMarketingName: toOptionalString(slice.cabinClassMarketingName),
			segments: parsedSegments,
		};
	});

	return {
		totalAmount: input.totalAmount ?? null,
		currency: (input.currency ?? "BRL").toUpperCase(),
		baseAmount: input.baseAmount ?? null,
		taxAmount: input.taxAmount ?? null,
		provider: toOptionalString(input.provider),
		offerReference: toOptionalString(input.offerReference),
		dataSource: toOptionalString(input.dataSource),
		metadata: input.metadata ?? null,
		slices,
	};
}

function parseSegmentInput(segment: z.infer<typeof flightSegmentToolSchema>) {
	const departure = splitDateTime(segment.departure);
	const arrival = splitDateTime(segment.arrival);

	return {
		originAirport: segment.originAirport,
		destinationAirport: segment.destinationAirport,
		departureDate: departure.dateOnly,
		departureTime: departure.time,
		arrivalDate: arrival.dateOnly,
		arrivalTime: arrival.time,
		marketingFlightNumber: toOptionalString(segment.marketingFlightNumber),
		operatingCarrierCode: toOptionalString(segment.operatingCarrierCode),
		aircraftName: toOptionalString(segment.aircraftName),
		aircraftType: toOptionalString(segment.aircraftType),
		distanceMeters: segment.distanceMeters ?? null,
		durationMinutes:
			segment.durationMinutes ??
			calculateDurationInMinutes(departure.full, arrival.full),
		baggageAllowance: undefined,
	};
}

function calculateDurationInMinutes(start: Date, end: Date) {
	const diff = end.getTime() - start.getTime();
	if (Number.isNaN(diff) || diff <= 0) {
		return null;
	}
	return Math.round(diff / 60000);
}

function calculateSliceDuration(
	segments: ReturnType<typeof parseSegmentInput>[],
) {
	const first = segments[0];
	const last = segments[segments.length - 1] ?? first;
	if (!first || !last) {
		return null;
	}
	return calculateDurationInMinutes(
		combineDateTime(first.departureDate, first.departureTime),
		combineDateTime(last.arrivalDate, last.arrivalTime),
	);
}

function splitDateTime(value: string) {
	const dateTime = new Date(value);
	if (Number.isNaN(dateTime.getTime())) {
		throw new Error(`Data/hora inválida: ${value}`);
	}
	const iso = dateTime.toISOString();
	const [datePart, timePartWithMs] = iso.split("T");
	const time = timePartWithMs.slice(0, 5);
	return {
		full: dateTime,
		dateOnly: new Date(`${datePart}T00:00:00.000Z`),
		time,
	};
}

function combineDateTime(dateOnly: Date, time: string) {
	const isoDate = dateOnly.toISOString().split("T")[0];
	return new Date(`${isoDate}T${time}:00`);
}

function toOptionalString(value?: string | null) {
	if (!value) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length === 0 ? undefined : trimmed;
}

async function syncFlightParticipants(
	flightDAO: FlightDAO,
	flightId: string,
	desiredParticipantIds: string[],
) {
	const existing = await flightDAO.getFlightById(flightId);
	if (!existing) {
		return;
	}

	const currentIds = existing.participants.map(
		(participant) => participant.user.id,
	);
	const toAdd = desiredParticipantIds.filter((id) => !currentIds.includes(id));
	const toRemove = currentIds.filter(
		(id) => !desiredParticipantIds.includes(id),
	);

	for (const participantId of toAdd) {
		await flightDAO.addFlightParticipant(flightId, participantId);
	}
	for (const participantId of toRemove) {
		await flightDAO.removeFlightParticipant(flightId, participantId);
	}
}

export class ListEventsTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}
	description =
		"Listar todos os eventos da viagem com diferentes níveis de detalhe e filtros opcionais";
	inputSchema = z.object({
		granularity: z
			.enum(["summary", "detailed"])
			.default("summary")
			.describe(
				"Nível de detalhe: 'summary' para visão geral (título, data, tipo) ou 'detailed' para informações completas",
			),
		filterByType: z
			.enum(["travel", "food", "activity"])
			.optional()
			.describe("Filtrar eventos por tipo específico (opcional)"),
		dateRange: z
			.object({
				startDate: z.string().describe("Data inicial para filtro (ISO 8601)"),
				endDate: z.string().describe("Data final para filtro (ISO 8601)"),
			})
			.optional()
			.describe("Filtrar eventos por período específico (opcional)"),
	});
	execute = async (
		input: z.TypeOf<typeof ListEventsTool.prototype.inputSchema>,
	) => {
		const eventDAO = createEventDAO(this.db);
		const travelDAO = createTravelDAO(this.db);

		const result = await getEventsByTravelService(
			eventDAO,
			travelDAO,
			this.travelContext.travelId,
		);

		if (AppResult.isFailure(result)) {
			return {
				success: false,
				error: result.error.message,
				events: [],
			} as const;
		}

		const events = result.data;

		// Apply filters if specified
		let filteredEvents = events;

		if (input.filterByType) {
			filteredEvents = events.filter(
				(event) => event.type === input.filterByType,
			);
		}

		if (input.dateRange) {
			const startDate = new Date(input.dateRange.startDate);
			const endDate = new Date(input.dateRange.endDate);
			filteredEvents = filteredEvents.filter((event) => {
				const eventStart = new Date(event.startDate);
				return eventStart >= startDate && eventStart <= endDate;
			});
		}

		// Format based on granularity
		const formattedEvents = filteredEvents.map((event) => {
			if (input.granularity === "detailed") {
				return {
					id: event.id,
					title: event.title,
					startDate: event.startDate.toISOString(),
					endDate: event.endDate.toISOString(),
					type: event.type,
					location: event.location,
					description: event.description,
					estimatedCost: event.estimatedCost,
					cost: event.cost,
					link: event.link,
				};
			}
			return {
				id: event.id,
				title: event.title,
				startDate: event.startDate.toISOString(),
				type: event.type,
			};
		});

		return {
			success: true,
			events: formattedEvents,
			count: formattedEvents.length,
			message: `Encontrados ${formattedEvents.length} eventos para esta viagem`,
		} as const;
	};
}

export class GetTravelParticipantsTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}
	description =
		"Buscar participantes da viagem atual com detalhes completos para planejamento e coordenação";
	inputSchema = z.object({
		includeDetails: z
			.boolean()
			.default(false)
			.describe("Incluir detalhes completos dos participantes"),
	});
	execute = async (
		input: z.TypeOf<typeof GetTravelParticipantsTool.prototype.inputSchema>,
	) => {
		const travelDAO = createTravelDAO(this.db);

		try {
			const participants = await travelDAO.getTravelMembers(
				this.travelContext.travelId,
			);

			if (participants.length === 0) {
				return {
					success: true,
					participants: [],
					count: 0,
					message: "Nenhum participante encontrado para esta viagem",
					planningContext: {
						hasOrganizer: false,
						totalGuests: 0,
						capacityForBookings: 0,
					},
				} as const;
			}

			const formattedParticipants = participants.map((participant) => {
				const baseInfo = {
					id: participant.userId,
					name: participant.user?.name || "Nome não informado",
					role: participant.role,
				};

				if (input.includeDetails) {
					return {
						...baseInfo,
						email: participant.user?.email,
						joinedAt: participant.createdAt.toISOString(),
						permissions: {
							canCreateEvents: participant.role === "owner",
							canModifyTrip: participant.role === "owner",
							canInviteOthers: participant.role === "owner",
						},
					};
				}

				return baseInfo;
			});

			const organizers = participants.filter((p) => p.role === "owner");
			const members = participants.filter((p) => p.role === "member");

			return {
				success: true,
				participants: formattedParticipants,
				count: participants.length,
				message: `${participants.length} participante(s) encontrado(s)`,
				planningContext: {
					hasOrganizer: organizers.length > 0,
					organizerCount: organizers.length,
					memberCount: members.length,
					totalGuests: participants.length,
					capacityForBookings: participants.length,
					canCoordinate: organizers.length > 0,
				},
			} as const;
		} catch (error) {
			return {
				success: false,
				participants: [],
				count: 0,
				message: "Erro ao buscar participantes da viagem",
				error: error instanceof Error ? error.message : "Erro desconhecido",
			} as const;
		}
	};
}

export class GetAccomodationsTool implements AppTool {
	constructor(
		readonly db: DB,
		readonly travelContext: TripContext,
	) {}
	description =
		"Buscar e listar acomodações da viagem atual com informações detalhadas para planejamento de eventos e atividades";
	inputSchema = z.object({
		location: z
			.string()
			.optional()
			.describe(
				"Local para buscar acomodações (se não especificado, usa destino da viagem)",
			),
		checkIn: z.string().optional().describe("Data de check-in (ISO 8601)"),
		checkOut: z.string().optional().describe("Data de check-out (ISO 8601)"),
		guests: z.number().default(1).describe("Número de hóspedes"),
	});
	execute = async (
		input: z.TypeOf<typeof GetAccomodationsTool.prototype.inputSchema>,
	) => {
		const accommodationDAO = createAccommodationDAO(this.db);
		const travelDAO = createTravelDAO(this.db);

		try {
			// Get travel info to validate location context
			const travel = await travelDAO.getTravelById(this.travelContext.travelId);
			if (!travel) {
				return {
					success: false,
					accommodations: [],
					count: 0,
					message: "Viagem não encontrada",
				} as const;
			}

			const accommodations = await accommodationDAO.getAccommodationsByTravel(
				this.travelContext.travelId,
			);

			if (accommodations.length === 0) {
				return {
					success: true,
					accommodations: [],
					count: 0,
					message: "Nenhuma acomodação cadastrada para esta viagem",
					planningContext: {
						hasAccommodations: false,
						totalCoveredDays: 0,
						needsAccommodation: true,
						travelDestination: travel.destination,
					},
				} as const;
			}

			// Filter by dates if provided
			let filteredAccommodations = accommodations;
			if (input.checkIn && input.checkOut) {
				const checkInDate = new Date(input.checkIn);
				const checkOutDate = new Date(input.checkOut);

				filteredAccommodations = accommodations.filter((acc) => {
					const accStart = new Date(acc.startDate);
					const accEnd = new Date(acc.endDate);
					// Check if accommodation period overlaps with requested period
					return accStart <= checkOutDate && accEnd >= checkInDate;
				});
			}

			const formattedAccommodations = filteredAccommodations.map((acc) => ({
				id: acc.id,
				name: acc.name,
				type: acc.type,
				address: acc.address,
				checkIn: acc.startDate.toISOString(),
				checkOut: acc.endDate.toISOString(),
				duration: Math.ceil(
					(acc.endDate.getTime() - acc.startDate.getTime()) /
						(1000 * 60 * 60 * 24),
				),
				price: acc.price,
				// Planning context for chaining
				planningInfo: {
					isAvailableForPeriod: true,
					nearbyEventOptions: acc.address, // Can be used for location-based event planning
					totalCost: acc.price,
				},
			}));

			// Calculate planning context
			const totalDuration = filteredAccommodations.reduce((total, acc) => {
				return (
					total +
					Math.ceil(
						(acc.endDate.getTime() - acc.startDate.getTime()) /
							(1000 * 60 * 60 * 24),
					)
				);
			}, 0);

			const totalCost = filteredAccommodations.reduce(
				(total, acc) => total + acc.price,
				0,
			);
			const avgPrice =
				filteredAccommodations.length > 0
					? filteredAccommodations.reduce(
							(total, acc) => total + acc.price,
							0,
						) / filteredAccommodations.length
					: 0;

			return {
				success: true,
				accommodations: formattedAccommodations,
				count: filteredAccommodations.length,
				message: `${filteredAccommodations.length} acomodação(ões) encontrada(s)`,
				planningContext: {
					hasAccommodations: accommodations.length > 0,
					totalAccommodations: accommodations.length,
					filteredCount: filteredAccommodations.length,
					totalCoveredDays: totalDuration,
					totalBudgetImpact: totalCost,
					averagePricePerNight: avgPrice,
					needsAccommodation: accommodations.length === 0,
					travelDestination: travel.destination,
				},
			} as const;
		} catch (error) {
			return {
				success: false,
				message: "Erro ao buscar acomodações",
				error: error instanceof Error ? error.message : "Erro desconhecido",
			} as const;
		}
	};
}
