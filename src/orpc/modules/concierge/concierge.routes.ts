import { optionalAuthProcedure } from "@/orpc/procedure";
import { type as orpcType } from "@orpc/server";
import {
	type ConciergeChatStreamInput,
	createConciergeStream,
} from "./concierge.ai";

export const chat = optionalAuthProcedure
	.input(orpcType<ConciergeChatStreamInput>())
	.handler(({ input }) => {
		return createConciergeStream(input);
	});
