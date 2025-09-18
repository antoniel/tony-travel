import * as z from "zod";

export type travelErrors = typeof travelErrors;
export const travelErrors = {
	TRAVEL_NOT_FOUND: {
		message: "Viagem não encontrada",
		data: z.object({
			travelId: z.string(),
		}),
	},
	TRAVEL_DATES_INVALID: {
		message: "As datas da viagem são inválidas",
		data: z.object({
			startDate: z.string(),
			endDate: z.string(),
		}),
	},
	TRAVEL_CREATION_FAILED: {
		message: "Não foi possível criar a viagem",
		data: z.object({
			reason: z.string(),
		}),
	},
	TRAVEL_MEMBER_CREATION_FAILED: {
		message: "Não foi possível adicionar o membro à viagem",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
			reason: z.string(),
		}),
	},
	USER_NOT_AUTHORIZED: {
		message: "Usuário sem autorização para esta viagem",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
	USER_ALREADY_MEMBER: {
		message: "Usuário já é membro desta viagem",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
	INSUFFICIENT_PERMISSIONS: {
		message: "Permissões insuficientes para executar esta ação",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
			requiredRole: z.string(),
			currentRole: z.string().optional(),
		}),
	},
	TRAVEL_MEMBER_NOT_FOUND: {
		message: "Membro da viagem não encontrado",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
	OWNER_CANNOT_LEAVE_TRAVEL: {
		message: "O proprietário da viagem não pode sair dela",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
	TRANSACTION_FAILED: {
		message: "Falha na transação com o banco de dados",
		data: z.object({
			operation: z.string(),
			reason: z.string(),
		}),
	},
	TRAVEL_UPDATE_FAILED: {
		message: "Não foi possível atualizar a viagem",
		data: z.object({
			travelId: z.string(),
			reason: z.string(),
		}),
	},
	TRAVEL_ALREADY_DELETED: {
		message: "Esta viagem já foi excluída",
		data: z.object({
			travelId: z.string(),
		}),
	},
	TRAVEL_DELETE_FAILED: {
		message: "Não foi possível excluir a viagem",
		data: z.object({
			travelId: z.string(),
			reason: z.string(),
		}),
	},
	TRAVEL_NAME_CONFIRMATION_REQUIRED: {
		message: "Confirme o nome da viagem para concluir a exclusão",
		data: z.object({
			travelId: z.string(),
			provided: z.string(),
			expected: z.string(),
		}),
	},
} as const;

/**
 * Type helper to extract travel error types
 */
export type TravelErrorTypes = keyof typeof travelErrors;
