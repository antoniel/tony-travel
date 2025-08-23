import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Event {
	id: string
	title: string
	date: Date
	type: 'travel' | 'food' | 'activity' | 'meeting'
	color: string
	time?: string
}

interface CalendarProps {
	events?: Event[]
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
	'January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'
]

export default function Calendar({ events = [] }: CalendarProps) {
	const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)) // January 2026
	const [view, setView] = useState<'month' | 'week' | 'day' | 'list'>('month')

	const year = currentDate.getFullYear()
	const month = currentDate.getMonth()

	const firstDayOfMonth = new Date(year, month, 1)
	const lastDayOfMonth = new Date(year, month + 1, 0)
	const firstDayOfWeek = firstDayOfMonth.getDay()
	const daysInMonth = lastDayOfMonth.getDate()

	const previousMonth = () => {
		setCurrentDate(new Date(year, month - 1, 1))
	}

	const nextMonth = () => {
		setCurrentDate(new Date(year, month + 1, 1))
	}

	const previousWeek = () => {
		const newDate = new Date(currentDate)
		newDate.setDate(currentDate.getDate() - 7)
		setCurrentDate(newDate)
	}

	const nextWeek = () => {
		const newDate = new Date(currentDate)
		newDate.setDate(currentDate.getDate() + 7)
		setCurrentDate(newDate)
	}

	const goToToday = () => {
		setCurrentDate(new Date(2026, 0, 1)) // Default to January 2026
	}

	const getEventsForDate = (date: Date) => {
		return events.filter(event => {
			const eventDate = new Date(event.date)
			return (
				eventDate.getDate() === date.getDate() &&
				eventDate.getMonth() === date.getMonth() &&
				eventDate.getFullYear() === date.getFullYear()
			)
		})
	}

	const parseTimeToPosition = (timeString: string) => {
		if (!timeString) return 0
		
		// Parse formats like "8:30a", "3:00p", "10:30a", "12p"
		const match = timeString.match(/(\d{1,2})(?::(\d{2}))?([ap])/i)
		if (!match) return 0
		
		let hours = Number.parseInt(match[1])
		const minutes = Number.parseInt(match[2] || '0')
		const amPm = match[3].toLowerCase()
		
		// Convert to 24-hour format
		if (amPm === 'p' && hours !== 12) {
			hours += 12
		} else if (amPm === 'a' && hours === 12) {
			hours = 0
		}
		
		// Calculate position relative to 6 AM start (each hour = 48px height)
		const startHour = 6
		if (hours < startHour) return 0 // Before 6 AM
		
		const hourPosition = (hours - startHour) * 48 // 48px per hour (h-12)
		const minutePosition = (minutes / 60) * 48 // Proportional minutes
		
		return hourPosition + minutePosition
	}

	const renderCalendarDays = () => {
		const days = []
		const totalCells = 42 // 6 rows × 7 days

		// Previous month days
		const prevMonth = new Date(year, month - 1, 0)
		const prevMonthDays = prevMonth.getDate()
		
		for (let i = firstDayOfWeek - 1; i >= 0; i--) {
			const dayNum = prevMonthDays - i
			const date = new Date(year, month - 1, dayNum)
			days.push(
				<div key={`prev-${dayNum}`} className="min-h-[120px] p-2 border border-gray-200 bg-gray-50">
					<div className="text-sm text-gray-400 font-medium mb-1">{dayNum}</div>
				</div>
			)
		}

		// Current month days
		for (let day = 1; day <= daysInMonth; day++) {
			const date = new Date(year, month, day)
			const dayEvents = getEventsForDate(date)
			const isToday = new Date().toDateString() === date.toDateString()

			days.push(
				<div key={day} className="min-h-[120px] p-2 border border-gray-200 bg-white hover:bg-gray-50">
					<div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>
						{day}
					</div>
					<div className="space-y-1">
						{dayEvents.map(event => (
							<div
								key={event.id}
								className="text-xs px-2 py-1 rounded text-white truncate"
								style={{ backgroundColor: event.color }}
								title={`${event.time ? event.time + ' ' : ''}${event.title}`}
							>
								{event.time && <span className="font-semibold">{event.time} </span>}
								{event.title}
							</div>
						))}
					</div>
				</div>
			)
		}

		// Next month days
		const remainingCells = totalCells - days.length
		for (let day = 1; day <= remainingCells; day++) {
			const date = new Date(year, month + 1, day)
			days.push(
				<div key={`next-${day}`} className="min-h-[120px] p-2 border border-gray-200 bg-gray-50">
					<div className="text-sm text-gray-400 font-medium mb-1">{day}</div>
				</div>
			)
		}

		return days
	}

	const getWeekDays = () => {
		const startOfWeek = new Date(currentDate)
		const day = startOfWeek.getDay()
		startOfWeek.setDate(currentDate.getDate() - day)

		const weekDays = []
		for (let i = 0; i < 7; i++) {
			const date = new Date(startOfWeek)
			date.setDate(startOfWeek.getDate() + i)
			weekDays.push(date)
		}
		return weekDays
	}

	const renderWeekView = () => {
		const weekDays = getWeekDays()
		const timeSlots: string[] = []
		
		// Create hourly time slots from 6 AM to 11 PM
		for (let hour = 6; hour <= 23; hour++) {
			const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
			const amPm = hour >= 12 ? 'PM' : 'AM'
			timeSlots.push(`${displayHour}:00 ${amPm}`)
		}

		return (
			<ScrollArea className="h-[80vh]">
				<div className="flex min-w-[800px]">
					{/* Time column */}
					<div className="w-20 border-r flex-shrink-0">
						<div className="h-16 border-b" /> {/* Header space */}
						{timeSlots.map((time) => (
							<div key={time} className="h-12 border-b text-xs text-gray-500 p-2">
								{time}
							</div>
						))}
					</div>

					{/* Days columns */}
					<div className="flex-1">
						{/* Days header */}
						<div className="grid grid-cols-7 h-16 border-b">
							{weekDays.map((date) => {
								const isToday = new Date().toDateString() === date.toDateString()
								return (
									<div key={date.toISOString()} className="border-r last:border-r-0 p-2 text-center">
										<div className="text-xs text-gray-500 uppercase">
											{DAYS_OF_WEEK[date.getDay()]}
										</div>
										<div className={`text-lg font-medium ${
											isToday ? 'text-blue-600 font-bold' : 'text-gray-900'
										}`}>
											{date.getDate()}
										</div>
									</div>
								)
							})}
						</div>

						{/* Time grid */}
						<div className="grid grid-cols-7">
							{weekDays.map((date) => {
								const dayEvents = getEventsForDate(date)
								return (
									<div key={date.toISOString()} className="border-r last:border-r-0 relative">
										{/* Hour lines */}
										{timeSlots.map((slot) => (
											<div key={slot} className="h-12 border-b" />
										))}

										{/* Events overlay */}
										<div className="absolute inset-0 pointer-events-none">
											{dayEvents.map((event, eventIndex) => {
												const topPosition = event.time ? parseTimeToPosition(event.time) : eventIndex * 20
												const eventHeight = event.time ? 36 : 18 // Timed events are taller
												
												return (
													<div
														key={event.id}
														className="absolute left-1 right-1 text-xs px-1 py-0.5 rounded text-white pointer-events-auto z-10"
														style={{ 
															backgroundColor: event.color,
															top: `${topPosition + 16}px`, // +16px to account for header
															height: `${eventHeight}px`,
															minHeight: '18px'
														}}
														title={`${event.time ? `${event.time} ` : ''}${event.title}`}
													>
														<div className="truncate">
															{event.time && <span className="font-semibold">{event.time} </span>}
															{event.title}
														</div>
													</div>
												)
											})}
										</div>
									</div>
								)
							})}
						</div>
					</div>
				</div>
			</ScrollArea>
		)
	}

	return (
		<div className="bg-white rounded-lg shadow-sm border">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b">
				<div className="flex items-center space-x-4">
					<div className="flex items-center space-x-2">
						<button
							type="button"
							onClick={view === 'week' ? previousWeek : previousMonth}
							className="p-1 hover:bg-gray-100 rounded"
						>
							<ChevronLeft className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={view === 'week' ? nextWeek : nextMonth}
							className="p-1 hover:bg-gray-100 rounded"
						>
							<ChevronRight className="h-4 w-4" />
						</button>
					</div>
					<button
						type="button"
						onClick={goToToday}
						className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
					>
						today
					</button>
				</div>

				<h2 className="text-xl font-semibold text-gray-900">
					{view === 'week' ? `Week of ${MONTHS[month]} ${currentDate.getDate()}, ${year}` : `${MONTHS[month]} ${year}`}
				</h2>

				<div className="flex items-center space-x-1">
					{(['month', 'week', 'day', 'list'] as const).map((viewType) => (
						<button
							key={viewType}
							type="button"
							onClick={() => setView(viewType)}
							className={`px-3 py-1 text-sm rounded ${
								view === viewType
									? 'bg-gray-900 text-white'
									: 'bg-gray-100 hover:bg-gray-200 text-gray-700'
							}`}
						>
							{viewType}
						</button>
					))}
				</div>
			</div>

			{/* Calendar Views */}
			{view === 'month' && (
				<div className="p-0">
					{/* Days of week header */}
					<div className="grid grid-cols-7 border-b">
						{DAYS_OF_WEEK.map(day => (
							<div key={day} className="p-3 text-sm font-medium text-gray-500 text-center border-r last:border-r-0">
								{day}
							</div>
						))}
					</div>
					
					{/* Calendar days */}
					<div className="grid grid-cols-7">
						{renderCalendarDays()}
					</div>
				</div>
			)}

			{view === 'week' && (
				<div className="p-0">
					{renderWeekView()}
				</div>
			)}

			{/* Other views placeholder */}
			{(view === 'day' || view === 'list') && (
				<div className="p-8 text-center text-gray-500">
					{view.charAt(0).toUpperCase() + view.slice(1)} view - Coming soon
				</div>
			)}
		</div>
	)
}