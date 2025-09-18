import type {
	InsertTravelMemberSchema,
	Travel,
	TravelMember,
	UpdateTravelSchema,
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

	const normalizedTravelData: typeof travelData = {
		...travelData,
		destinationAirports: Array.from(
			new Map(
				travelData.destinationAirports.map((airport) => [
					airport.value,
					airport,
				]),
			).values(),
		),
	};

	try {
		// Use database transaction to ensure atomicity
		const result = await db.transaction(async (tx) => {
			// Create the travel first
			const travelId = await travelDAO.createTravelWithTransaction(tx, {
				...normalizedTravelData,
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

export async function updateTravelService(
	travelDAO: TravelDAO,
	travelId: string,
	userId: string,
	updateData: z.infer<typeof UpdateTravelSchema>,
): Promise<AppResult<Travel, typeof travelErrors>> {
	try {
		// First check if user has permission and travel exists
		const permissionResult = await checkUserTravelPermissionService(
			travelDAO,
			travelId,
			userId,
			"owner", // Only owners can update travel settings
		);

		if (AppResult.isFailure(permissionResult)) {
			return permissionResult;
		}

		// Validate dates if they are being updated
		if (updateData.startDate && updateData.endDate) {
			const dateValidation = validateTravelDates(
				updateData.startDate,
				updateData.endDate,
			);

			if (AppResult.isFailure(dateValidation)) {
				return dateValidation;
			}
		}

		const normalizedUpdateData: typeof updateData = { ...updateData };

		if (
			normalizedUpdateData.destinationAirports &&
			normalizedUpdateData.destinationAirports.length === 0
		) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_UPDATE_FAILED",
				"Falha ao atualizar viagem",
				{
					travelId,
					reason: "Lista de aeroportos de destino não pode ficar vazia",
				},
			);
		}

		if (normalizedUpdateData.destinationAirports) {
			normalizedUpdateData.destinationAirports = Array.from(
				new Map(
					normalizedUpdateData.destinationAirports.map((airport) => [
						airport.value,
						airport,
					]),
				).values(),
			);
		}

		// Update the travel
		const updatedTravel = await travelDAO.updateTravel(
			travelId,
			normalizedUpdateData,
		);

		if (!updatedTravel) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_UPDATE_FAILED",
				"Falha ao atualizar viagem",
				{
					travelId,
					reason: "Travel not found or already deleted",
				},
			);
		}

		return AppResult.success(updatedTravel);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		return AppResult.failure(
			travelErrors,
			"TRAVEL_UPDATE_FAILED",
			"Falha ao atualizar viagem",
			{
				travelId,
				reason: errorMessage,
			},
		);
	}
}

export async function softDeleteTravelService(
	travelDAO: TravelDAO,
	travelId: string,
	userId: string,
	confirmationName: string,
): Promise<AppResult<Travel, typeof travelErrors>> {
	try {
		// First check if user has permission and travel exists
		const permissionResult = await checkUserTravelPermissionService(
			travelDAO,
			travelId,
			userId,
			"owner", // Only owners can delete travel
		);

		if (AppResult.isFailure(permissionResult)) {
			return permissionResult;
		}

		// Get the travel to check its name for confirmation
		const travel = await travelDAO.getTravelById(travelId);
		if (!travel) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_NOT_FOUND",
				"Viagem não encontrada",
				{ travelId },
			);
		}

		// Check if travel is already deleted
		if (travel.deletedAt) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_ALREADY_DELETED",
				"Viagem já foi excluída",
				{ travelId },
			);
		}

		// Validate name confirmation
		if (confirmationName.trim() !== travel.name.trim()) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_NAME_CONFIRMATION_REQUIRED",
				"Nome da viagem deve ser confirmado para exclusão",
				{
					travelId,
					provided: confirmationName,
					expected: travel.name,
				},
			);
		}

		// Perform soft delete
		const deletedTravel = await travelDAO.softDeleteTravel(travelId, userId);

		if (!deletedTravel) {
			return AppResult.failure(
				travelErrors,
				"TRAVEL_DELETE_FAILED",
				"Falha ao excluir viagem",
				{
					travelId,
					reason: "Travel not found or already deleted",
				},
			);
		}

		return AppResult.success(deletedTravel);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		return AppResult.failure(
			travelErrors,
			"TRAVEL_DELETE_FAILED",
			"Falha ao excluir viagem",
			{
				travelId,
				reason: errorMessage,
			},
		);
	}
}
