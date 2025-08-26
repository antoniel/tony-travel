import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: "http://localhost:3000", // Adjust this URL as needed
});

export const {
	signIn,
	signOut,
	signUp,
	useSession,
} = authClient;