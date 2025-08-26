export type Travel = {
	id: string;
	name: string;
	destination: string;
	startDate: Date;
	endDate: Date;
	accommodation: Accommodation[];
	events: AppEvent[];
	locationInfo: LocationInfo;
	visaInfo: VisaInfo;
};

export type Accommodation = {
	id: string;
	name: string;
	type: "hotel" | "hostel" | "airbnb" | "resort" | "other";
	startDate: Date;
	endDate: Date;
	address?: string;
	rating?: number;
	price?: number;
	currency?: string;
};

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

export interface AppEvent {
	id: string;
	title: string;
	startDate: Date;
	endDate: Date;
	estimatedCost?: number;
	type: "travel" | "food" | "activity";
	location?: string;
	imageUrl?: string;
	imageMetadata?: ImageMetadata;
	/**
	 * Some events need to include locomotion to the location.
	 * so you should include the locomotion event as a dependency.
	 */
	dependencies?: AppEvent[];
}

export interface ImageMetadata {
	source: "pixabay" | "manual";
	tags: string[];
	photographer?: string;
	fetchedAt: Date;
	pixabayId?: number;
}
