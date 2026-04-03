import app from "./app";
import { config } from "./common/config";

export default {
	port: config.API_PORT,
	fetch: app.fetch,
};
