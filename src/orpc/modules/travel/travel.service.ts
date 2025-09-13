import type {
	InsertTravelMemberSchema,
	Travel,
	TravelMember,
} from "@/lib/db/schema";
import type { DB } from "@/lib/db/types";
import { AppResult } from "@/orpc/appResult";
import type * as z from "zod";
import type { TravelDAO } from "./travel.dao";
import { travelErrors } from "./travel.errors";
import type { InsertFullTravel } from "./travel.model";

export function validateTravelDates(
	startDate: Date,
	endDate: Date,
): AppResult<boolean, typeof travelErrors> {
	if (startDate >= endDate) {
		return AppResult.failure(
			travelErrors,
			"TRAVEL_DATES_INVALID",
			"Data de início deve ser anterior à data de fim",
			{
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		);
	}

	// Check if start date is in the past (allowing same day)
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (startDate < today) {
		return AppResult.failure(
			travelErrors,
			"TRAVEL_DATES_INVALID",
			"Data de início não pode ser no passado",
			{
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		);
	}

	return AppResult.success(true);
}

export async function createTravelService(
	db: DB,
	travelDAO: TravelDAO,
	userId: string,
	travelData: z.infer<typeof InsertFullTravel>,
): Promise<AppResult<{ id: string; travel: Travel }, typeof travelErrors>> {
	// Validate travel dates
	const dateValidation = validateTravelDates(
		travelData.startDate,
		travelData.endDate,
	);

	if (AppResult.isFailure(dateValidation)) {
		return dateValidation;
	}

	try {
		// Use database transaction to ensure atomicity
		const result = await db.transaction(async (tx) => {
			// Create the travel first
			const travelId = await travelDAO.createTravelWithTransaction(tx, {
				...travelData,
				userId,
			});

			// Create TravelMember record for the creator with owner role
			const travelMemberData: z.infer<typeof InsertTravelMemberSchema> = {
				travelId,
				userId,
				role: "owner",
			};

			const travelMemberId = await travelDAO.createTravelMemberWithTransaction(
				tx,
				travelMemberData,
			);

			if (!travelMemberId) {
				throw new Error("Failed to create travel member record");
			}

			// Get the created travel with all relations
			const travel = await travelDAO.getTravelByIdWithTransaction(tx, travelId);

			if (!travel) {
				throw new Error("Failed to retrieve created travel");
			}

			return { id: travelId, travel };
		});

		return AppResult.success(result);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		if (errorMessage.includes("travel member")) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_MEMBER_CREATION_FAILED",
				`Falha ao criar membro da viagem ${errorMessage}`,
				{
					travelId: "",
					userId,
					reason: errorMessage,
				},
			);
		}

		return AppResult.failure(
			travelErrors,
			"TRAVEL_CREATION_FAILED",
			"Falha ao criar viagem",
			{
				reason: errorMessage,
			},
		);
	}
}

export async function getTravelService(
	travelDAO: TravelDAO,
	travelId: string,
	userId?: string,
) {
	try {
		const travel = await travelDAO.getTravelById(travelId);

		if (!travel) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_NOT_FOUND",
				"Viagem não encontrada",
				{ travelId },
			);
		}

		// Add membership info if user is provided
		let userMembership: TravelMember | null = null;
		if (userId) {
			userMembership = await travelDAO.getTravelMember(travelId, userId);
		}

		return AppResult.success({
			...travel,
			userMembership,
		});
	} catch (error) {
		return AppResult.failure(
			travelErrors,
			"TRAVEL_NOT_FOUND",
			"Erro ao buscar viagem",
			{ travelId },
		);
	}
}

export async function getTravelMembersService(
	travelDAO: TravelDAO,
	travelId: string,
): Promise<AppResult<TravelMember[], typeof travelErrors>> {
	try {
		// First check if travel exists
		const travel = await travelDAO.getTravelById(travelId);
		if (!travel) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_NOT_FOUND",
				"Viagem não encontrada",
				{ travelId },
			);
		}

		const members = await travelDAO.getTravelMembers(travelId);
		return AppResult.success(members);
	} catch (error) {
		return AppResult.failure(
			travelErrors,
			"TRAVEL_NOT_FOUND",
			"Erro ao buscar membros da viagem",
			{ travelId },
		);
	}
}

export async function checkUserTravelPermissionService(
	travelDAO: TravelDAO,
	travelId: string,
	userId: string,
	requiredRole?: "owner" | "member",
): Promise<AppResult<TravelMember, typeof travelErrors>> {
	try {
		const member = await travelDAO.getTravelMember(travelId, userId);

		if (!member) {
			return AppResult.failure(
				travelErrors,
				"USER_NOT_AUTHORIZED",
				"Usuário não autorizado para esta viagem",
				{ travelId, userId },
			);
		}

		// Check role if specified
		if (requiredRole && requiredRole === "owner" && member.role !== "owner") {
			return AppResult.failure(
				travelErrors,
				"INSUFFICIENT_PERMISSIONS",
				"Permissões insuficientes para executar esta ação",
				{
					travelId,
					userId,
					requiredRole,
					currentRole: member.role,
				},
			);
		}

		return AppResult.success(member);
	} catch (error) {
		return AppResult.failure(
			travelErrors,
			"USER_NOT_AUTHORIZED",
			"Erro ao verificar permissões do usuário",
			{ travelId, userId },
		);
	}
}
