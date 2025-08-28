import type {
	Accommodation as AccommodationDb,
	AppEvent as AppEventDb,
} from "@/lib/db/schema";
import type { InferResultType } from "./db/type-utils";

export type TravelWithRelations = InferResultType<
	"Travel",
	{
		accommodations: true;
		events: {
			with: {
				dependencies: true;
			};
		};
	}
>;

// export type Accommodation = {
// 	id: string;
// 	name: string;
// 	type: "hotel" | "hostel" | "airbnb" | "resort" | "other";
// 	startDate: Date;
// 	endDate: Date;
// 	address?: string;
// 	rating?: number;
// 	price?: number;
// 	currency?: string;
// };
export type Accommodation = AccommodationDb;

export type LocationInfo = {
	destination: string;
	country: string;
	climate: string;
	currency: string;
	language: string;
	timeZone: string;
	bestTimeToVisit: string;
	emergencyNumbers?: {
		police?: string;
		medical?: string;
		embassy?: string;
	};
};

export type VisaInfo = {
	required: boolean;
	stayDuration: string;
	documents: string[];
	vaccinations: string[];
	entryRequirements?: string[];
};

// export type AppEvent = {
// 	id: string;
// 	title: string;
// 	startDate: Date;
// 	endDate: Date;
// 	estimatedCost?: number | null;
// 	type: "travel" | "food" | "activity";
// 	location?: string;
// 	imageUrl?: string;
// 	imageMetadata?: ImageMetadata;
// 	/**
// 	 * Some events need to include locomotion to the location.
// 	 * so you should include the locomotion event as a dependency.
// 	 */
// 	dependencies?: AppEvent[];
// }
export type AppEvent = AppEventDb;

export interface ImageMetadata {
	source: "pixabay" | "manual";
	tags: string[];
	photographer?: string;
	fetchedAt: Date;
	pixabayId?: number;
}
