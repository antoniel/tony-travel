import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useUser } from "@/hooks/useUser";
import { orpc } from "@/orpc/client";
import type { InviteInfoResponse } from "@/orpc/modules/invitation/invitation.model";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	AlertCircle,
	Calendar,
	CheckCircle,
	Loader2,
	MapPin,
	UserCheck,
	Users,
} from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/invite/$token")({
	component: InviteAcceptancePage,
});

function InviteAcceptancePage() {
	const { token } = Route.useParams();
	const userQuery = useUser();
	const router = useRouter();

	const inviteInfoQuery = useQuery(
		orpc.invitationRoutes.getInviteInfo.queryOptions({ input: { token } }),
	);

	const acceptInviteMutation = useMutation(
		orpc.invitationRoutes.acceptInvite.mutationOptions(),
	);

	const isLoading = userQuery.isLoading || inviteInfoQuery.isLoading;
	const inviteInfo = inviteInfoQuery.data;

	useEffect(() => {
		if (!userQuery.isAuthenticated && !userQuery.isLoading) {
			const currentUrl = window.location.pathname;
			router.navigate({
				to: "/",
				search: { redirect: currentUrl },
			});
		}
	}, [userQuery.isAuthenticated, userQuery.isLoading, router]);

	const handleAcceptInvite = async () => {
		if (!userQuery.isAuthenticated) return;

		try {
			const result = await acceptInviteMutation.mutateAsync({ token });

			if (result.success) {
				toast.success("Convite aceito com sucesso!", {
					description: result.message || "Você agora é membro desta viagem.",
				});
				router.navigate({ to: `/trip/${result.travelId}` });
			} else {
				toast.error("Erro ao aceitar convite", {
					description: result.message || "Tente novamente mais tarde.",
				});
			}
		} catch (error) {
			toast.error("Erro ao aceitar convite", {
				description: "Ocorreu um erro inesperado. Tente novamente.",
			});
		}
	};

	if (isLoading) {
		return <LoadingState />;
	}

	if (!inviteInfo?.isValid) {
		return <InvalidInviteState inviteInfo={inviteInfo} />;
	}

	if (!userQuery.isAuthenticated) {
		return <LoginRequiredState />;
	}

	return (
		<ValidInviteState
			inviteInfo={inviteInfo}
			onAccept={handleAcceptInvite}
			isAccepting={acceptInviteMutation.isPending}
		/>
	);
}

function LoadingState() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
			<Card className="w-full max-w-md mx-4">
				<CardContent className="flex flex-col items-center justify-center py-12">
					<Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
					<p className="text-muted-foreground">Verificando convite...</p>
				</CardContent>
			</Card>
		</div>
	);
}

function InvalidInviteState({
	inviteInfo,
}: { inviteInfo: InviteInfoResponse | undefined }) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 dark:from-gray-900 dark:to-gray-800">
			<Card className="w-full max-w-md mx-4 border-red-200 dark:border-red-800">
				<CardHeader className="text-center">
					<div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
					</div>
					<CardTitle className="text-red-700 dark:text-red-300">
						{inviteInfo?.isExpired ? "Convite Expirado" : "Convite Inválido"}
					</CardTitle>
					<CardDescription className="text-red-600 dark:text-red-400">
						{inviteInfo?.message ||
							(inviteInfo?.isExpired
								? "Este link de convite expirou. Solicite um novo convite ao organizador da viagem."
								: "Este link de convite não é válido ou foi removido.")}
					</CardDescription>
				</CardHeader>
				<CardContent className="text-center">
					<Button
						variant="outline"
						onClick={() => window.history.back()}
						className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
					>
						Voltar
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

function LoginRequiredState() {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
			<Card className="w-full max-w-md mx-4">
				<CardHeader className="text-center">
					<div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<UserCheck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
					</div>
					<CardTitle>Login Necessário</CardTitle>
					<CardDescription>
						Você precisa estar logado para aceitar este convite.
					</CardDescription>
				</CardHeader>
			</Card>
		</div>
	);
}

function ValidInviteState({
	inviteInfo,
	onAccept,
	isAccepting,
}: {
	inviteInfo: InviteInfoResponse;
	onAccept: () => void;
	isAccepting: boolean;
}) {
	const travel = inviteInfo.travel;

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 p-4">
			<Card className="w-full max-w-lg">
				<CardHeader className="text-center">
					<div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
						<Users className="w-8 h-8 text-green-600 dark:text-green-400" />
					</div>
					<CardTitle className="text-2xl">Você foi convidado!</CardTitle>
					<CardDescription>
						Você recebeu um convite para participar desta viagem
					</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					<TravelDetails travel={travel} />

					<div className="pt-4 border-t">
						<Button
							onClick={onAccept}
							disabled={isAccepting}
							className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600"
							size="lg"
						>
							{isAccepting ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									Aceitando convite...
								</>
							) : (
								<>
									<CheckCircle className="w-4 h-4 mr-2" />
									Aceitar Convite
								</>
							)}
						</Button>

						<p className="text-xs text-center text-muted-foreground mt-3">
							Ao aceitar, você se tornará membro desta viagem e poderá
							visualizar todos os detalhes do planejamento.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function TravelDetails({
	travel,
}: { travel: NonNullable<InviteInfoResponse["travel"]> | null }) {
	if (!travel) return null;

	const formatDate = (date: Date) => {
		return new Intl.DateTimeFormat("pt-BR", {
			day: "2-digit",
			month: "long",
			year: "numeric",
		}).format(new Date(date));
	};

	const getDuration = () => {
		const start = new Date(travel.startDate);
		const end = new Date(travel.endDate);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
		return diffDays;
	};

	return (
		<div className="space-y-4">
			<div className="text-center">
				<h2 className="text-xl font-semibold text-foreground mb-2">
					{travel.name}
				</h2>
				<div className="flex items-center justify-center gap-2 text-muted-foreground">
					<MapPin className="w-4 h-4" />
					<span>{travel.destination}</span>
				</div>
			</div>

			<div className="bg-muted/50 rounded-lg p-4 space-y-3">
				<div className="flex items-center gap-3">
					<Calendar className="w-4 h-4 text-muted-foreground" />
					<div className="flex-1">
						<p className="text-sm font-medium">Período da viagem</p>
						<p className="text-xs text-muted-foreground">
							{formatDate(travel.startDate)} - {formatDate(travel.endDate)}
						</p>
						<p className="text-xs text-muted-foreground">
							{getDuration()} dia{getDuration() !== 1 ? "s" : ""}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
