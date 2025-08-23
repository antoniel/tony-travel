import Calendar from "@/components/Calendar";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/calendar")({
	component: CalendarPage,
});

function CalendarPage() {
	// Sample events to demonstrate the calendar - January 2026
	const sampleEvents = [
		{
			id: "1",
			title: "Trip Planning",
			date: new Date(2026, 0, 3), // January 3, 2026
			type: "activity" as const,
			color: "#3b82f6",
		},
		{
			id: "2",
			title: "Flight to Paris",
			date: new Date(2026, 0, 5), // January 5, 2026
			type: "travel" as const,
			color: "#10b981",
			time: "8:30a",
		},
		{
			id: "3",
			title: "Hotel Check-in",
			date: new Date(2026, 0, 5), // January 5, 2026
			type: "activity" as const,
			color: "#3b82f6",
			time: "3:00p",
		},
		{
			id: "4",
			title: "Dinner at Le Bernardin",
			date: new Date(2026, 0, 6), // January 6, 2026
			type: "food" as const,
			color: "#f59e0b",
			time: "7:00p",
		},
		{
			id: "5",
			title: "Louvre Museum",
			date: new Date(2026, 0, 7), // January 7, 2026
			type: "activity" as const,
			color: "#8b5cf6",
			time: "10:00a",
		},
		{
			id: "6",
			title: "Lunch at Café",
			date: new Date(2026, 0, 7), // January 7, 2026
			type: "food" as const,
			color: "#f59e0b",
			time: "1:00p",
		},
		{
			id: "7",
			title: "Train to Lyon",
			date: new Date(2026, 0, 8), // January 8, 2026
			type: "travel" as const,
			color: "#10b981",
			time: "9:15a",
		},
		{
			id: "8",
			title: "Wine Tasting",
			date: new Date(2026, 0, 9), // January 9, 2026
			type: "activity" as const,
			color: "#8b5cf6",
			time: "4:00p",
		},
		{
			id: "9",
			title: "Return Flight",
			date: new Date(2026, 0, 12), // January 12, 2026
			type: "travel" as const,
			color: "#10b981",
			time: "11:45a",
		},
		{
			id: "10",
			title: "Meeting with Travel Agent",
			date: new Date(2026, 0, 15), // January 15, 2026
			type: "meeting" as const,
			color: "#ef4444",
			time: "2:30p",
		},
	];

	return (
		<div className="min-h-screen bg-gray-50 py-6">
			<div className="max-w-7xl mx-auto px-4">
				<div className="mb-4">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Trip Calendar
					</h1>
				</div>

				<Calendar events={sampleEvents} />
			</div>
		</div>
	);
}
