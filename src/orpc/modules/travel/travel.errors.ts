import * as z from "zod";

export type travelErrors = typeof travelErrors;
export const travelErrors = {
	TRAVEL_NOT_FOUND: {
		message: "Travel not found",
		data: z.object({
			travelId: z.string(),
		}),
	},
	TRAVEL_DATES_INVALID: {
		message: "Travel dates are invalid",
		data: z.object({
			startDate: z.string(),
			endDate: z.string(),
		}),
	},
	TRAVEL_CREATION_FAILED: {
		message: "Failed to create travel",
		data: z.object({
			reason: z.string(),
		}),
	},
	TRAVEL_MEMBER_CREATION_FAILED: {
		message: "Failed to create travel member",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
			reason: z.string(),
		}),
	},
	USER_NOT_AUTHORIZED: {
		message: "User not authorized for this travel",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
	USER_ALREADY_MEMBER: {
		message: "User is already a member of this travel",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
	INSUFFICIENT_PERMISSIONS: {
		message: "Insufficient permissions to perform this action",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
			requiredRole: z.string(),
			currentRole: z.string().optional(),
		}),
	},
	TRAVEL_MEMBER_NOT_FOUND: {
		message: "Travel member not found",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
	OWNER_CANNOT_LEAVE_TRAVEL: {
		message: "Travel owner cannot leave travel",
		data: z.object({
			travelId: z.string(),
			userId: z.string(),
		}),
	},
	TRANSACTION_FAILED: {
		message: "Database transaction failed",
		data: z.object({
			operation: z.string(),
			reason: z.string(),
		}),
	},
	TRAVEL_UPDATE_FAILED: {
		message: "Failed to update travel",
		data: z.object({
			travelId: z.string(),
			reason: z.string(),
		}),
	},
	TRAVEL_ALREADY_DELETED: {
		message: "Travel has already been deleted",
		data: z.object({
			travelId: z.string(),
		}),
	},
	TRAVEL_DELETE_FAILED: {
		message: "Failed to delete travel",
		data: z.object({
			travelId: z.string(),
			reason: z.string(),
		}),
	},
	TRAVEL_NAME_CONFIRMATION_REQUIRED: {
		message: "Travel name confirmation required for deletion",
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
