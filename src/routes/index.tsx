import Calendar from "@/components/Calendar";
import { colombiaEvents } from "@/data/colombia";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: CalendarPage,
});

function CalendarPage() {
	return (
		<div className="min-h-screen bg-gray-50 py-6">
			<div className="max-w-7xl mx-auto px-4">
				<div className="mb-4">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						Trip Calendar
					</h1>
				</div>

				<Calendar events={colombiaEvents} />
			</div>
		</div>
	);
}
