import { serverEnv } from "@/env";

export interface PixabayImage {
	id: number;
	webformatURL: string;
	webformatWidth: number;
	webformatHeight: number;
	previewURL: string;
	previewWidth: number;
	previewHeight: number;
	largeImageURL: string;
	views: number;
	downloads: number;
	likes: number;
	tags: string;
	user: string;
	userImageURL: string;
}

export interface PixabayResponse {
	total: number;
	totalHits: number;
	hits: PixabayImage[];
}

export interface ImageMetadata {
	source: "pixabay" | "manual";
	tags: string[];
	photographer?: string;
	fetchedAt: Date;
	pixabayId?: number;
}

export class PixabayService {
	private readonly apiKey: string | undefined;
	private readonly baseUrl = "https://pixabay.com/api/";
	private readonly cache = new Map<
		string,
		{ data: PixabayImage; timestamp: number }
	>();
	private readonly cacheLifetime = 24 * 60 * 60 * 1000; // 24 hours

	constructor() {
		this.apiKey = serverEnv.PIXABAY_API_KEY;
	}

	private getCacheKey(query: string, category?: string): string {
		return `${query}${category ? `_${category}` : ""}`;
	}

	private isValidCacheEntry(timestamp: number): boolean {
		return Date.now() - timestamp < this.cacheLifetime;
	}

	private extractKeywords(title: string, location?: string): string {
		// Extract meaningful keywords from activity title
		const commonWords = [
			"the",
			"a",
			"an",
			"and",
			"or",
			"but",
			"in",
			"on",
			"at",
			"to",
			"for",
			"of",
			"with",
			"by",
		];

		let keywords = title
			.toLowerCase()
			.replace(/[^\w\s]/g, " ")
			.split(" ")
			.filter((word) => word.length > 2 && !commonWords.includes(word))
			.slice(0, 3) // Limit to first 3 meaningful words
			.join(" ");

		// Add location if available and different from activity words
		if (location && location.length > 2) {
			const locationKeyword = location.split(",")[0].trim(); // Take first part before comma
			if (!keywords.toLowerCase().includes(locationKeyword.toLowerCase())) {
				keywords += ` ${locationKeyword}`;
			}
		}

		return keywords.trim() || "travel activity";
	}

	private async fetchFromPixabay(
		query: string,
		category?: string,
	): Promise<PixabayImage[]> {
		if (!this.apiKey) {
			console.warn("Pixabay API key not configured");
			return [];
		}

		const params = new URLSearchParams({
			key: this.apiKey,
			q: encodeURIComponent(query),
			image_type: "photo",
			orientation: "horizontal",
			category: category || "places",
			min_width: "640",
			min_height: "480",
			per_page: "5",
			safesearch: "true",
			order: "popular",
		});

		try {
			const response = await fetch(`${this.baseUrl}?${params}`);

			if (!response.ok) {
				console.error(
					`Pixabay API error: ${response.status} ${response.statusText}`,
				);
				return [];
			}

			const data: PixabayResponse = await response.json();
			return data.hits || [];
		} catch (error) {
			console.error("Failed to fetch images from Pixabay:", error);
			return [];
		}
	}

	async searchActivityImage(
		title: string,
		location?: string,
	): Promise<PixabayImage | null> {
		const keywords = this.extractKeywords(title, location);
		const cacheKey = this.getCacheKey(keywords, "places");

		// Check cache first
		const cached = this.cache.get(cacheKey);
		if (cached && this.isValidCacheEntry(cached.timestamp)) {
			return cached.data;
		}

		// Try different search strategies
		const searchStrategies = [
			{ query: keywords, category: "places" },
			{ query: keywords, category: "sports" },
			{ query: keywords, category: "travel" },
			{ query: location || "travel", category: "places" }, // Fallback to location only
		];

		for (const strategy of searchStrategies) {
			const images = await this.fetchFromPixabay(
				strategy.query,
				strategy.category,
			);

			if (images && images.length > 0) {
				const selectedImage = images[0]; // Use the most popular image

				// Cache the result
				this.cache.set(cacheKey, {
					data: selectedImage,
					timestamp: Date.now(),
				});

				return selectedImage;
			}
		}

		return null;
	}

	createImageMetadata(image: PixabayImage): ImageMetadata {
		return {
			source: "pixabay",
			tags: image.tags.split(", "),
			photographer: image.user,
			fetchedAt: new Date(),
			pixabayId: image.id,
		};
	}

	getImageSizes(image: PixabayImage) {
		return {
			thumbnail: {
				url: image.previewURL,
				width: image.previewWidth,
				height: image.previewHeight,
			},
			medium: {
				url: image.webformatURL,
				width: image.webformatWidth,
				height: image.webformatHeight,
			},
			large: {
				url: image.largeImageURL,
				width: image.webformatWidth * 2,
				height: image.webformatHeight * 2,
			},
		};
	}

	// Helper method to clear old cache entries
	clearExpiredCache(): void {
		const now = Date.now();
		for (const [key, value] of this.cache.entries()) {
			if (!this.isValidCacheEntry(value.timestamp)) {
				this.cache.delete(key);
			}
		}
	}
}

// Export a singleton instance
export const pixabayService = new PixabayService();
