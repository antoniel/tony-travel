import { InsertAppEventSchema, TravelMember } from "@/lib/db/schema";
import { startPlanTravel } from "@/lib/planTravel.prompt";
import { pixabayService } from "@/lib/services/pixabay";
import {
	authProcedure,
	optionalAuthProcedure,
	travelMemberProcedure,
} from "@/orpc/procedure";
import { os } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import enhancedAirports from "./enhanced-airports.json";
import { createTravelDAO } from "./travel.dao";
import { type Airport, AirportSchema, InsertFullTravel } from "./travel.model";

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
		return startPlanTravel(input);
	});

export const saveTravel = authProcedure
	.input(z.object({ travel: InsertFullTravel }))
	.output(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);
		// Associar o travel ao usuário logado
		const travelWithUser = {
			...input.travel,
			userId: context.user.id,
		};
		const id = await travelDAO.createTravel(travelWithUser);
		return { id };
	});

export const getTravel = optionalAuthProcedure
	.input(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);
		const travel = await travelDAO.getTravelById(input.id);

		if (!travel) {
			throw new Error("Travel not found");
		}

		// Add membership info if user is logged in
		if (context.user) {
			const membership = await context.db.query.TravelMember.findFirst({
				where: and(
					eq(TravelMember.travelId, input.id),
					eq(TravelMember.userId, context.user.id),
				),
			});
			return { ...travel, userMembership: membership };
		}

		return { ...travel, userMembership: null };
	});

export const listTravels = optionalAuthProcedure
	.input(
		z
			.object({
				userId: z.string().optional(),
				limit: z.number().default(10).optional(),
			})
			.optional(),
	)
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);
		// Se especificou userId e não é o próprio usuário, só mostra públicas
		if (input?.userId && input.userId !== context.user?.id) {
			// Implementar filtro para travels públicas
			return await travelDAO.getAllTravels();
		}

		// Se é o próprio usuário ou não especificou, mostra todas
		return await travelDAO.getAllTravels();
	});

export const fetchActivityImage = optionalAuthProcedure
	.input(
		z.object({
			eventId: z.string(),
			title: z.string().min(1),
			location: z.string().optional(),
		}),
	)
	.output(
		z.object({
			success: z.boolean(),
			imageUrl: z.string().nullable(),
			metadata: z
				.object({
					source: z.enum(["pixabay", "manual"]),
					tags: z.array(z.string()),
					photographer: z.string().optional(),
					fetchedAt: z.date(),
					pixabayId: z.number().optional(),
				})
				.nullable(),
			imageSizes: z
				.object({
					thumbnail: z.object({
						url: z.string(),
						width: z.number(),
						height: z.number(),
					}),
					medium: z.object({
						url: z.string(),
						width: z.number(),
						height: z.number(),
					}),
					large: z.object({
						url: z.string(),
						width: z.number(),
						height: z.number(),
					}),
				})
				.optional(),
			error: z.string().optional(),
		}),
	)
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);
		try {
			const image = await pixabayService.searchActivityImage(
				input.title,
				input.location,
			);

			if (!image) {
				return {
					success: false,
					error: "No suitable image found",
					imageUrl: null,
					metadata: null,
				};
			}

			const metadata = pixabayService.createImageMetadata(image);
			if (input.eventId) {
				await travelDAO.updateEventImage(
					input.eventId,
					image.webformatURL,
					metadata,
				);
			}

			return {
				success: true,
				imageUrl: image.webformatURL,
				metadata,
				imageSizes: pixabayService.getImageSizes(image),
			};
		} catch (error) {
			console.error("Error fetching activity image:", error);
			return {
				success: false,
				error: "Failed to fetch image",
				imageUrl: null,
				metadata: null,
			};
		}
	});

export const updateEventImage = optionalAuthProcedure
	.input(
		z.object({
			eventId: z.string(),
			imageUrl: z.string(),
			metadata: z.object({
				source: z.enum(["pixabay", "manual"]),
				tags: z.array(z.string()),
				photographer: z.string().optional(),
				fetchedAt: z.date(),
				pixabayId: z.number().optional(),
			}),
		}),
	)
	.output(z.object({ success: z.boolean() }))
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);
		try {
			await travelDAO.updateEventImage(
				input.eventId,
				input.imageUrl,
				input.metadata,
			);
			return { success: true };
		} catch (error) {
			console.error("Error updating event image:", error);
			return { success: false };
		}
	});

export const searchAirports = os
	.input(
		z.object({
			query: z.string().optional().default(""),
			limit: z.number().int().min(1).max(50).optional().default(10),
		}),
	)
	.output(z.array(AirportSchema))
	.handler(({ input }) => {
		const { query, limit } = input;

		// Convert enhanced airports data to our Airport type
		let filteredAirports: Airport[] = enhancedAirports.map((airport) => ({
			code: airport.iata,
			name: airport.name,
			city: airport.city,
			state: airport.state,
			stateCode: airport.stateCode,
			country: airport.country,
			countryCode: airport.countryCode,
			type: airport.type as
				| "airport"
				| "city_group"
				| "state_group"
				| "country_group",
			airportCount: airport.airportCount,
			airportCodes: airport.airportCodes,
		}));

		if (query.trim()) {
			const searchTerm = query.toLowerCase().trim();

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

		return filteredAirports.slice(0, limit).sort((a, b) => {
			// Country groups come first
			if (a.type === "country_group" && b.type !== "country_group") return -1;
			if (a.type !== "country_group" && b.type === "country_group") return 1;

			// State groups come second
			if (
				a.type === "state_group" &&
				b.type !== "state_group" &&
				b.type !== "country_group"
			)
				return -1;
			if (
				a.type !== "state_group" &&
				a.type !== "country_group" &&
				b.type === "state_group"
			)
				return 1;

			// City groups come third
			if (a.type === "city_group" && b.type === "airport") return -1;
			if (a.type === "airport" && b.type === "city_group") return 1;

			if (query.trim()) {
				const searchTerm = query.toLowerCase().trim();

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

export const createEvent = travelMemberProcedure
	.input(InsertAppEventSchema)
	.output(z.object({ id: z.string() }))
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);
		const id = await travelDAO.createEvent(input);
		return { id };
	});
