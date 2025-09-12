import * as travelRoutes from "../modules/travel/travel.routes";
import * as flightRoutes from "../modules/flight/flight.routes";

export default {
	...travelRoutes,
	...flightRoutes,
};
