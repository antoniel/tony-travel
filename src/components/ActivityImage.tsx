import type { ImageMetadata } from "@/lib/types";
import { Camera, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

interface ActivityImageProps {
	imageUrl?: string;
	imageMetadata?: ImageMetadata;
	title: string;
	location?: string;
	className?: string;
	onRefreshImage?: () => void;
	showRefreshButton?: boolean;
	isLoading?: boolean;
}

export default function ActivityImage({
	imageUrl,
	title,
	location,
	className = "",
	onRefreshImage,
	showRefreshButton = false,
	isLoading = false,
}: ActivityImageProps) {
	const [imageLoadError, setImageLoadError] = useState(false);
	const [imageLoading, setImageLoading] = useState(true);

	const handleImageLoad = () => {
		setImageLoading(false);
		setImageLoadError(false);
	};

	const handleImageError = () => {
		setImageLoading(false);
		setImageLoadError(true);
	};

	const handleRefresh = () => {
		setImageLoadError(false);
		setImageLoading(true);
		onRefreshImage?.();
	};

	if (isLoading) {
		return (
			<div className={`relative ${className}`}>
				<Skeleton className="w-full h-48 rounded-lg" />
				<div className="absolute inset-0 flex items-center justify-center">
					<RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			</div>
		);
	}

	if (!imageUrl || imageLoadError) {
		return (
			<div
				className={`relative bg-muted rounded-lg flex flex-col items-center justify-center p-6 min-h-48 ${className}`}
			>
				<Camera className="h-12 w-12 text-muted-foreground mb-2" />
				<p className="text-sm text-muted-foreground text-center mb-3">
					{imageLoadError ? "Erro ao carregar imagem" : "Imagem não disponível"}
				</p>

				{showRefreshButton && onRefreshImage && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleRefresh}
						className="text-xs"
					>
						<RefreshCw className="h-3 w-3 mr-1" />
						Buscar imagem
					</Button>
				)}
			</div>
		);
	}

	return (
		<div className={`relative group ${className}`}>
			{imageLoading && (
				<Skeleton className="absolute inset-0 w-full h-full rounded-lg" />
			)}

			<img
				src={imageUrl}
				alt={`${title} ${location ? `em ${location}` : ""}`}
				className="w-full h-48 object-cover rounded-lg transition-opacity duration-200"
				style={{ opacity: imageLoading ? 0 : 1 }}
				onLoad={handleImageLoad}
				onError={handleImageError}
			/>

			{showRefreshButton && onRefreshImage && (
				<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
					<Button
						variant="secondary"
						size="sm"
						onClick={handleRefresh}
						className="h-8 w-8 p-0"
					>
						<RefreshCw className="h-3 w-3" />
					</Button>
				</div>
			)}
		</div>
	);
}
