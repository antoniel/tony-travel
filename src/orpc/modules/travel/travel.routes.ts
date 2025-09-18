import {
	AccommodationSchema,
	AppEventSchema,
	TravelMemberSchema,
	TravelSchema,
	UpdateTravelSchema,
} from "@/lib/db/schema";
import { startPlanTravel } from "@/lib/planTravel.prompt";
import { AppResult } from "@/orpc/appResult";
import {
	authProcedure,
	optionalAuthProcedure,
	travelMemberProcedure,
} from "@/orpc/procedure";
import { ORPCError } from "@orpc/client";
import { os } from "@orpc/server";
import * as z from "zod";
import enhancedAirports from "./enhanced-airports.json";
import { createTravelDAO } from "./travel.dao";
import { travelErrors } from "./travel.errors";
import { type Airport, AirportSchema, InsertFullTravel } from "./travel.model";

type EnhancedAirport = (typeof enhancedAirports)[number];

const enhancedAirportByCode = new Map<string, EnhancedAirport>(
	enhancedAirports.map((airport) => [airport.iata, airport]),
);

const toAirport = (airport: EnhancedAirport): Airport => ({
	code: airport.iata,
	name: airport.name,
	city: airport.city,
	state: airport.state,
	stateCode: airport.stateCode,
	country: airport.country,
	countryCode: airport.countryCode,
	type: airport.type as Airport["type"],
	airportCount: airport.airportCount,
	airportCodes: airport.airportCodes,
});

const expandStateGroupedAirports = (airports: Airport[]): Airport[] => {
	const expanded: Airport[] = [];
	const seen = new Set<string>();

	for (const airport of airports) {
		if (
			airport.type === "state_group" &&
			Array.isArray(airport.airportCodes) &&
			airport.airportCodes.length > 0
		) {
			for (const code of airport.airportCodes) {
				const raw = enhancedAirportByCode.get(code);
				if (!raw) continue;
				const mapped = toAirport(raw);
				if (seen.has(mapped.code)) continue;
				expanded.push(mapped);
				seen.add(mapped.code);
			}
			continue;
		}

		if (seen.has(airport.code)) continue;
		expanded.push(airport);
		seen.add(airport.code);
	}

	return expanded;
};
import {
	createTravelService,
	getTravelMembersService,
	getTravelService,
	softDeleteTravelService,
	updateTravelService,
} from "./travel.service";

export const generatePrompt = os
	.input(
		z.object({
			tripDates: z.object({ start: z.string(), end: z.string() }),
			budget: z.object({ perPerson: z.number(), currency: z.string() }),
			destination: z.string(),
			groupSize: z.number().int().min(1),
			departureAirports: z.array(AirportSchema).min(1),
		}),
	)
	.output(z.string())
	.handler(({ input }) => {
		const expandedDepartureAirports = expandStateGroupedAirports(
			input.departureAirports,
		);

		return startPlanTravel({
			...input,
			departureAirports: expandedDepartureAirports,
		});
	});

export const saveTravel = authProcedure
	.errors(travelErrors)
	.input(z.object({ travel: InsertFullTravel }))
	.output(z.object({ id: z.string(), travel: TravelSchema }))
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);

		const result = await createTravelService(
			context.db,
			travelDAO,
			context.user.id,
			input.travel,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const getTravel = optionalAuthProcedure
	.errors(travelErrors)
	.input(z.object({ id: z.string() }))
	.output(
		TravelSchema.extend({
			userMembership: TravelMemberSchema.nullable().optional(),
			accommodations: z.array(AccommodationSchema),
			events: z.array(
				AppEventSchema.extend({
					dependencies: z.array(AppEventSchema),
				}),
			),
		}),
	)
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);

		const result = await getTravelService(
			travelDAO,
			input.id,
			context.user?.id,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const listTravels = optionalAuthProcedure
	.errors(travelErrors)
	.input(
		z
			.object({
				userId: z.string().optional(),
				limit: z.number().default(10).optional(),
			})
			.optional(),
	)
	.output(z.array(TravelSchema))
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);
		const limit = input?.limit ?? 10;
		// Se especificou userId e não é o próprio usuário, só mostra públicas
		if (input?.userId && input.userId !== context.user?.id) {
			// Implementar filtro para travels públicas
			return await travelDAO.getAllTravels(limit);
		}

		return await travelDAO.getAllTravels(limit);
	});

// New routes for travel member management
export const getTravelMembers = travelMemberProcedure
	.errors(travelErrors)
	.input(z.object({ travelId: z.string() }))
	.output(z.array(z.any()))
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);

		const result = await getTravelMembersService(travelDAO, input.travelId);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const searchAirports = os
	.input(
		z.object({
			query: z.string().optional().default(""),
			limit: z.number().int().min(1).max(50).optional().default(10),
			expandGroups: z.boolean().optional().default(false),
		}),
	)
	.output(z.array(AirportSchema))
	.handler(({ input }) => {
		const { query, limit, expandGroups } = input;

		// Convert enhanced airports data to our Airport type
		let filteredAirports: Airport[] = enhancedAirports.map(toAirport);

		const trimmedQuery = query.trim();
		if (trimmedQuery) {
			const searchTerm = trimmedQuery.toLowerCase();

			filteredAirports = filteredAirports.filter((airport) => {
				const matchesName = airport.name.toLowerCase().includes(searchTerm);
				const matchesCity = airport.city.toLowerCase().includes(searchTerm);
				const matchesState =
					airport.state?.toLowerCase().includes(searchTerm) || false;
				const matchesCountry = airport.country
					.toLowerCase()
					.includes(searchTerm);
				const matchesIata = airport.code.toLowerCase().includes(searchTerm);
				const matchesCountryCode = airport.countryCode
					.toLowerCase()
					.includes(searchTerm);

				return (
					matchesName ||
					matchesCity ||
					matchesState ||
					matchesCountry ||
					matchesIata ||
					matchesCountryCode
				);
			});
		}

		// Remove country aggregators from search results
		filteredAirports = filteredAirports.filter(
			(airport) => airport.type !== "country_group",
		);

		if (expandGroups) {
			filteredAirports = expandStateGroupedAirports(filteredAirports).filter(
				(airport) => airport.type === "airport",
			);
		}

		const sortedAirports = [...filteredAirports].sort((a, b) => {
			if (expandGroups) {
				if (trimmedQuery) {
					const searchTerm = trimmedQuery.toLowerCase();
					const aExactIata = a.code.toLowerCase() === searchTerm;
					const bExactIata = b.code.toLowerCase() === searchTerm;
					if (aExactIata && !bExactIata) return -1;
					if (!aExactIata && bExactIata) return 1;

					const aExactCity = a.city.toLowerCase() === searchTerm;
					const bExactCity = b.city.toLowerCase() === searchTerm;
					if (aExactCity && !bExactCity) return -1;
					if (!aExactCity && bExactCity) return 1;
				}

				const countryCompare = a.country.localeCompare(b.country);
				if (countryCompare !== 0) return countryCompare;

				const cityCompare = a.city.localeCompare(b.city);
				if (cityCompare !== 0) return cityCompare;

				return a.code.localeCompare(b.code);
			}

			// State groups come first
			if (a.type === "state_group" && b.type !== "state_group") return -1;
			if (a.type !== "state_group" && b.type === "state_group") return 1;

			// City groups come second
			if (a.type === "city_group" && b.type === "airport") return -1;
			if (a.type === "airport" && b.type === "city_group") return 1;

			if (trimmedQuery) {
				const searchTerm = trimmedQuery.toLowerCase();

				// Among individual airports, exact IATA code match comes first
				if (a.type === "airport" && b.type === "airport") {
					const aExactIata = a.code.toLowerCase() === searchTerm;
					const bExactIata = b.code.toLowerCase() === searchTerm;
					if (aExactIata && !bExactIata) return -1;
					if (!aExactIata && bExactIata) return 1;

					// Exact city match comes second
					const aExactCity = a.city.toLowerCase() === searchTerm;
					const bExactCity = b.city.toLowerCase() === searchTerm;
					if (aExactCity && !bExactCity) return -1;
					if (!aExactCity && bExactCity) return 1;
				}
			}

			// Default sort by country, then by city
			const countryCompare = a.country.localeCompare(b.country);
			if (countryCompare !== 0) return countryCompare;

			return a.city.localeCompare(b.city);
		});

		return sortedAirports.slice(0, limit);
	});

export const searchDestinations = os
	.input(
		z.object({
			query: z.string().optional().default(""),
			limit: z.number().int().min(1).max(50).optional().default(10),
		}),
	)
	.output(
		z.array(
			z.object({
				value: z.string(),
				label: z.string(),
				country: z.string(),
				countryCode: z.string(),
			}),
		),
	)
	.handler(({ input }) => {
		const { query, limit } = input;

		// Get unique countries from airports data for destinations
		const countries = Array.from(
			new Set(
				enhancedAirports
					.filter((airport) => airport.type === "country_group")
					.map((airport) => ({
						value: airport.countryCode.toLowerCase(),
						label: airport.country,
						country: airport.country,
						countryCode: airport.countryCode,
					})),
			),
		);

		let filteredDestinations = countries;

		if (query.trim()) {
			const searchTerm = query.toLowerCase().trim();
			filteredDestinations = countries.filter((dest) => {
				const matchesLabel = dest.label.toLowerCase().includes(searchTerm);
				const matchesCountry = dest.country.toLowerCase().includes(searchTerm);
				const matchesCode = dest.countryCode.toLowerCase().includes(searchTerm);
				return matchesLabel || matchesCountry || matchesCode;
			});
		}

		return filteredDestinations
			.slice(0, limit)
			.sort((a, b) => a.label.localeCompare(b.label));
	});

// New routes for travel settings
export const updateTravel = authProcedure
	.errors(travelErrors)
	.input(
		z.object({
			travelId: z.string(),
			updateData: UpdateTravelSchema,
		}),
	)
	.output(TravelSchema)
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);

		const result = await updateTravelService(
			travelDAO,
			input.travelId,
			context.user.id,
			input.updateData,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});

export const deleteTravel = authProcedure
	.errors(travelErrors)
	.input(
		z.object({
			travelId: z.string(),
			confirmationName: z.string(),
		}),
	)
	.output(TravelSchema)
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);

		const result = await softDeleteTravelService(
			travelDAO,
			input.travelId,
			context.user.id,
			input.confirmationName,
		);

		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}

		return result.data;
	});
