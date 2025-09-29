import { AppResult } from "@/orpc/appResult";
import { travelMemberProcedure } from "@/orpc/procedure";
import { ORPCError, type as orpcType } from "@orpc/server";

import { createFlightDAO } from "../flight/flight.dao";
import { createTravelDAO } from "../travel/travel.dao";
import { getTripContext } from "./CONCIERGE_SYSTEM_PROMPT";
import {
	type ConciergeChatStreamInput,
	createConciergeStream,
} from "./concierge.ai";
import { conciergeErrors } from "./concierge.errors";
import { PendingIssuesSummarySchema } from "./concierge.model";
import { getPendingIssuesService } from "./concierge.service";

export const chat = travelMemberProcedure
	.input(orpcType<ConciergeChatStreamInput & { travelId: string }>())
	.handler(async ({ input, context }) => {
		const tripContext = await getTripContext(context.db, input.travelId);
		return createConciergeStream(input, tripContext, context.db);
	});

export const getPendingIssues = travelMemberProcedure
	.errors(conciergeErrors)
	.input(orpcType<{ travelId: string }>())
	.output(PendingIssuesSummarySchema)
	.handler(async ({ input, context }) => {
		const travelDAO = createTravelDAO(context.db);
		const flightDAO = createFlightDAO(context.db);
		const result = await getPendingIssuesService(
			travelDAO,
			flightDAO,
			input.travelId,
		);
		if (AppResult.isFailure(result)) {
			throw new ORPCError(result.error.type, {
				message: result.error.message,
				data: result.error.data,
			});
		}
		return result.data;
	});
