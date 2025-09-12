import * as flightRoutes from "../modules/flight/flight.routes";
import * as travelRoutes from "../modules/travel/travel.routes";

export default {
	...travelRoutes,
	...flightRoutes,
};
