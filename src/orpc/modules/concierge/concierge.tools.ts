import type { DB } from "@/lib/db/types";
import { AppResult } from "@/orpc/appResult";
import type { Tool } from "ai";
import { z } from "zod";
import { createAccommodationDAO } from "../accommodation/accommodation.dao";
import { createEventDAO } from "../event/event.dao";
import { getEventsByTravelService } from "../event/event.service";
import { createTravelDAO } from "../travel/travel.dao";
import type { TripContext } from "./CONCIERGE_SYSTEM_PROMPT";

interface AppTool extends Pick<Tool, "description" | "execute"> {
	db: DB;
	travelContext: TripContext;
	inputSchema: Tool["inputSchema"];
	outputSchema?: Tool["outputSchema"];
}

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
