import { db } from "../../db";
import { BotConfigRepository } from "./bot-config.repository";
import { BotConfigService } from "./bot-config.service";

const botConfigRepository = new BotConfigRepository(db);
export const botConfigService = new BotConfigService(botConfigRepository);

export { default as botConfigRoutes } from "./bot-config.routes";
