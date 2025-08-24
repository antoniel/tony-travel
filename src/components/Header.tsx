import { Link } from "@tanstack/react-router";

export default function Header() {
	return (
		<header className="p-2 flex gap-2 bg-white text-black justify-between border-b">
			<nav className="flex flex-row">
				<div className="px-2 font-bold">
					<Link to="/" className="hover:text-primary">
						Home
					</Link>
				</div>

				<div className="px-2 font-bold">
					<Link to="/calendar" className="hover:text-primary">
						Calendar
					</Link>
				</div>
			</nav>
		</header>
	);
}
