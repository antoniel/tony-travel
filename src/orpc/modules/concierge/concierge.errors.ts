import * as z from "zod";

export const conciergeErrors = {
	PROVIDER_UNAVAILABLE: {
		message: "Fornecedor de IA não configurado ou indisponível",
		data: z.object({ provider: z.string().optional() }).optional(),
	},
	COMPLETION_FAILED: {
		message: "Não foi possível gerar a resposta do concierge",
		data: z
			.object({
				reason: z.string().optional(),
			})
			.optional(),
	},
} as const;

export type ConciergeErrorCode = keyof typeof conciergeErrors;
