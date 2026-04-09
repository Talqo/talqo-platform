import { db } from "../../db";
import { DrizzleAuthRepository } from "./auth.repository";
import { createAuthRouter } from "./auth.routes";
import { AuthService } from "./auth.service";

const repo = new DrizzleAuthRepository(db);
const service = new AuthService(repo);

export const authRoutes = createAuthRouter(service);
