import { travelMemberProcedure } from "@/orpc/procedure";
import { type as orpcType } from "@orpc/server";
import { getTripContext } from "./CONCIERGE_SYSTEM_PROMPT";
import {
	type ConciergeChatStreamInput,
	createConciergeStream,
} from "./concierge.ai";

export const chat = travelMemberProcedure
	.input(orpcType<ConciergeChatStreamInput & { travelId: string }>())
	.handler(async ({ input, context }) => {
		const tripContext = await getTripContext(context.db, input.travelId);
		return createConciergeStream(input, tripContext, context.db);
	});
