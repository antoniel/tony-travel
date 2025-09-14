import { useTravelMembership } from "@/hooks/useTravelMembership";
import { useUser } from "@/hooks/useUser";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";

interface TravelMemberOnlyProps {
	children: React.ReactNode;
	travelId: string;
	fallback?: React.ReactNode;
	showLoginPrompt?: boolean;
}

export function TravelMemberOnly({
	children,
	travelId,
	fallback,
	showLoginPrompt = true,
}: TravelMemberOnlyProps) {
	const { isAuthenticated, isLoading: userLoading } = useUser();
	const travelMembershipQuery = useTravelMembership(travelId);

	if (userLoading || travelMembershipQuery.isLoading) {
		return fallback || <MembershipLoadingState />;
	}

	if (!isAuthenticated) {
		return fallback || (showLoginPrompt ? <LoginPrompt /> : null);
	}

	const role = travelMembershipQuery.data?.userMembership?.role;
	if (!role || (role !== "member" && role !== "owner")) {
		return fallback || <AccessDeniedState />;
	}

	return <>{children}</>;
}

function MembershipLoadingState() {
	return (
		<div className="flex items-center justify-center py-8">
			<div className="flex flex-col items-center gap-3">
				<Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">
					Verificando permissões...
				</p>
			</div>
		</div>
	);
}

function LoginPrompt() {
	return (
		<Card className="max-w-md mx-auto">
			<CardHeader className="text-center">
				<div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
					<Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
				</div>
				<CardTitle>Login Necessário</CardTitle>
				<CardDescription>
					Você precisa fazer login para acessar esta viagem.
				</CardDescription>
			</CardHeader>
			<CardContent className="text-center">
				<Button
					onClick={() => {
						window.location.href = "/auth/login";
					}}
				>
					Fazer Login
				</Button>
			</CardContent>
		</Card>
	);
}

function AccessDeniedState() {
	return (
		<Alert className="max-w-md mx-auto border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
			<AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
			<AlertTitle className="text-orange-800 dark:text-orange-300">
				Acesso Restrito
			</AlertTitle>
			<AlertDescription className="text-orange-700 dark:text-orange-400">
				Você não tem permissão para acessar esta viagem. Entre em contato com o
				organizador para solicitar acesso.
			</AlertDescription>
		</Alert>
	);
}
