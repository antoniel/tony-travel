import type {
	Accommodation,
	LocationInfo,
	Travel,
	VisaInfo,
} from "@/lib/types";
import { colombiaEvents } from "./colombia";

export const colombiaLocationInfo: LocationInfo = {
	destination: "Colombia",
	country: "Colombia",
	climate:
		"Tropical climate with regional variations, Caribbean coast is hot and humid, Andean regions are cooler",
	currency: "Colombian Peso (COP)",
	language: "Spanish",
	timeZone: "GMT-5 (COT)",
	bestTimeToVisit: "December to March (dry season)",
	emergencyNumbers: {
		police: "123",
		medical: "125",
		embassy: "+57-1-275-2000 (US Embassy)",
	},
};

export const colombiaVisaInfo: VisaInfo = {
	required: false,
	stayDuration: "90 days tourist visa on arrival",
	documents: [
		"Valid passport (6+ months remaining)",
		"Return or onward ticket",
		"Proof of accommodation",
		"Proof of sufficient funds ($50 per day)",
	],
	vaccinations: [
		"Yellow fever (required for some areas)",
		"Hepatitis A/B",
		"Typhoid",
		"Routine vaccines (MMR, DPT, flu)",
	],
	entryRequirements: [
		"No visa required for stays under 90 days",
		"Must have return ticket",
		"Immigration form filled on arrival",
	],
};

export const colombiaAccommodations: Accommodation[] = [
	{
		id: "bogota-hostel",
		name: "Bogotá Backpackers Hostel",
		type: "hostel",
		startDate: new Date("2026-02-01"),
		endDate: new Date("2026-02-03"),
		address: "La Candelaria, Bogotá",
		rating: 4.3,
		price: 20,
		currency: "USD",
	},
	{
		id: "medellin-hotel",
		name: "Poblado Plaza Hotel",
		type: "hotel",
		startDate: new Date("2026-02-03"),
		endDate: new Date("2026-02-06"),
		address: "El Poblado, Medellín",
		rating: 4.5,
		price: 60,
		currency: "USD",
	},
	{
		id: "cartagena-boutique",
		name: "Old City Boutique Hotel",
		type: "hotel",
		startDate: new Date("2026-02-06"),
		endDate: new Date("2026-02-09"),
		address: "Ciudad Amurallada, Cartagena",
		rating: 4.7,
		price: 85,
		currency: "USD",
	},
];

export const colombiaTravel: Travel = {
	id: "colombia-highlights-2026",
	name: "Colombia Highlights - Bogotá to Cartagena",
	destination: "Colombia",
	startDate: new Date("2026-02-01"),
	endDate: new Date("2026-02-09"),
	accommodation: colombiaAccommodations,
	events: colombiaEvents,
	locationInfo: colombiaLocationInfo,
	visaInfo: colombiaVisaInfo,
};
