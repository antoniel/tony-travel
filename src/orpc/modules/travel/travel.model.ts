import * as z from "zod";

const VisaInfoSchema = z.object({
	required: z.boolean(),
	stayDuration: z.string(),
	documents: z.array(z.string()),
	vaccinations: z.array(z.string()),
	entryRequirements: z.array(z.string()).optional(),
});
const LocationInfoSchema = z.object({
	destination: z.string(),
	country: z.string(),
	climate: z.string(),
	currency: z.string(),
	language: z.string(),
	timeZone: z.string(),
	bestTimeToVisit: z.string(),
	emergencyNumbers: z
		.object({
			police: z.string().optional(),
			medical: z.string().optional(),
			embassy: z.string().optional(),
		})
		.optional(),
});
const AccommodationSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: z.enum(["hotel", "hostel", "airbnb", "resort", "other"]),
	startDate: z.date(),
	endDate: z.date(),
	address: z.string().optional(),
	rating: z.number().optional(),
	price: z.number().optional(),
	currency: z.string().optional(),
});
// biome-ignore lint: fix later
const AppEventSchema: z.ZodType<any> = z.lazy(() =>
	z.object({
		id: z.string(),
		title: z.string(),
		startDate: z.date(),
		endDate: z.date(),
		estimatedCost: z.number().optional(),
		type: z.enum(["travel", "food", "activity"]),
		location: z.string().optional(),
		dependencies: z.array(AppEventSchema).optional(),
	}),
);
export const TravelSchema = z.object({
	// id is assigned server-side
	name: z.string(),
	destination: z.string(),
	startDate: z.date(),
	endDate: z.date(),
	accommodation: z.array(AccommodationSchema),
	events: z.array(AppEventSchema),
	locationInfo: LocationInfoSchema,
	visaInfo: VisaInfoSchema,
});
