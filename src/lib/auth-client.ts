import { clientEnv } from "@/clientEnv";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
	baseURL: clientEnv.VITE_APP_URL,
});

export const { signIn, signOut, signUp, useSession } = authClient;
