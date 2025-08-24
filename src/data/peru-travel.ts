import type {
	Accommodation,
	LocationInfo,
	Travel,
	VisaInfo,
} from "@/lib/types";
import { colombiaEvents } from "./colombia";

export const peruLocationInfo: LocationInfo = {
	destination: "Peru",
	country: "Peru",
	climate:
		"Desert coastal with mild temperatures, Andean highlands with cold nights, Amazon rainforest with high humidity",
	currency: "Peruvian Sol (PEN)",
	language: "Spanish, Quechua",
	timeZone: "GMT-5 (PET)",
	bestTimeToVisit: "December to April (dry season)",
	emergencyNumbers: {
		police: "105",
		medical: "106",
		embassy: "+51-1-618-2000 (US Embassy)",
	},
};

export const peruVisaInfo: VisaInfo = {
	required: false,
	stayDuration: "90 days tourist visa on arrival",
	documents: [
		"Valid passport (6+ months remaining)",
		"Return or onward ticket",
		"Proof of accommodation",
		"Proof of sufficient funds ($25-30 per day)",
	],
	vaccinations: [
		"Yellow fever (recommended for jungle areas)",
		"Hepatitis A/B",
		"Typhoid",
		"Routine vaccines (MMR, DPT, flu)",
	],
	entryRequirements: [
		"No visa required for stays under 90 days",
		"Must have return ticket",
		"Immigration card filled on arrival",
	],
};

export const peruAccommodations: Accommodation[] = [
	{
		id: "lima-hostel",
		name: "Lima Backpackers Hostel",
		type: "hostel",
		startDate: new Date("2026-01-10"),
		endDate: new Date("2026-01-12"),
		address: "Miraflores, Lima",
		rating: 4.2,
		price: 25,
		currency: "USD",
	},
	{
		id: "paracas-hotel",
		name: "Paracas Bay Hotel",
		type: "hotel",
		startDate: new Date("2026-01-12"),
		endDate: new Date("2026-01-14"),
		address: "Paracas Bay, Ica",
		rating: 4.0,
		price: 45,
		currency: "USD",
	},
	{
		id: "huacachina-lodge",
		name: "Desert Lodge Huacachina",
		type: "hotel",
		startDate: new Date("2026-01-13"),
		endDate: new Date("2026-01-15"),
		address: "Huacachina Oasis, Ica",
		rating: 3.8,
		price: 35,
		currency: "USD",
	},
	{
		id: "cusco-hostel",
		name: "Cusco Central Hostel",
		type: "hostel",
		startDate: new Date("2026-01-16"),
		endDate: new Date("2026-01-21"),
		address: "San Blas, Cusco",
		rating: 4.5,
		price: 20,
		currency: "USD",
	},
];

export const peruTravel: Travel = {
	id: "peru-adventure-2026",
	name: "Peru Adventure - Lima to Cusco",
	destination: "Peru",
	startDate: new Date("2026-01-10"),
	endDate: new Date("2026-01-21"),
	accommodation: peruAccommodations,
	events: colombiaEvents, // Using the existing events data
	locationInfo: peruLocationInfo,
	visaInfo: peruVisaInfo,
};
