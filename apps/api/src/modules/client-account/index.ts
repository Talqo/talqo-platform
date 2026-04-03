import { db } from "../../db";
import { ClientAccountRepository } from "./client-account.repository";
import { ClientAccountService } from "./client-account.service";

const clientAccountRepository = new ClientAccountRepository(db);
export const clientAccountService = new ClientAccountService(
	clientAccountRepository,
);

export { default as clientAccountRoutes } from "./client-account.routes";
