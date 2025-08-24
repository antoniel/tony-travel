import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cloud, CloudRain, Sun, Wind } from "lucide-react";

interface WeatherWidgetProps {
	destination: string;
}

export default function WeatherWidget({ destination }: WeatherWidgetProps) {
	// Mock weather data - in a real app, this would come from a weather API
	const mockWeatherData = {
		Lima: {
			current: { temp: 22, condition: "Sunny", humidity: 75, wind: 12 },
			forecast: [
				{ day: "Today", temp: 22, condition: "sunny" },
				{ day: "Tomorrow", temp: 24, condition: "cloudy" },
				{ day: "Sat", temp: 21, condition: "rainy" },
			],
		},
		Peru: {
			current: { temp: 18, condition: "Partly Cloudy", humidity: 65, wind: 8 },
			forecast: [
				{ day: "Today", temp: 18, condition: "cloudy" },
				{ day: "Tomorrow", temp: 20, condition: "sunny" },
				{ day: "Sat", temp: 16, condition: "rainy" },
			],
		},
	};

	const weatherData =
		mockWeatherData[destination as keyof typeof mockWeatherData] ||
		mockWeatherData.Peru;

	const getWeatherIcon = (condition: string) => {
		switch (condition) {
			case "sunny":
				return <Sun className="h-4 w-4 text-chart-5" />;
			case "cloudy":
				return <Cloud className="h-4 w-4 text-muted-foreground" />;
			case "rainy":
				return <CloudRain className="h-4 w-4 text-chart-1" />;
			default:
				return <Sun className="h-4 w-4 text-chart-5" />;
		}
	};

	return (
		<Card className="mb-4">
			<CardHeader className="pb-3">
				<CardTitle className="text-sm flex items-center gap-2">
					<Sun className="h-4 w-4" />
					Current Weather - {destination}
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-3">
					{/* Current Weather */}
					<div className="flex items-center justify-between">
						<div>
							<div className="text-2xl font-bold">
								{weatherData.current.temp}°C
							</div>
							<div className="text-sm text-muted-foreground">
								{weatherData.current.condition}
							</div>
						</div>
						<div className="text-right text-xs space-y-1">
							<div className="flex items-center gap-1">
								<Wind className="h-3 w-3" />
								{weatherData.current.wind} km/h
							</div>
							<div>Humidity: {weatherData.current.humidity}%</div>
						</div>
					</div>

					{/* 3-day Forecast */}
					<div className="grid grid-cols-3 gap-2 pt-2 border-t">
						{weatherData.forecast.map((day) => (
							<div key={day.day} className="text-center">
								<div className="text-xs text-muted-foreground mb-1">
									{day.day}
								</div>
								<div className="flex justify-center mb-1">
									{getWeatherIcon(day.condition)}
								</div>
								<div className="text-xs font-semibold">{day.temp}°</div>
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
