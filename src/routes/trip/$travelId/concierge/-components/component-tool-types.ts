import type { InferUITools } from "ai";
import type { MyConciergeTools } from "@/orpc/modules/concierge/concierge.ai";

export type AddToolResultType = <T extends keyof InferUITools<MyConciergeTools>>(
	args: {
		tool: T;
		toolCallId: string;
		output: InferUITools<MyConciergeTools>[T]["output"];
	},
) => Promise<void>;

export type AccommodationPayload = {
	name: string;
	type: "hotel" | "hostel" | "airbnb" | "resort" | "other";
	address: string;
	startDate: Date;
	endDate: Date;
	price: number;
};

export type AccommodationUpdatePayload = Partial<AccommodationPayload>;
