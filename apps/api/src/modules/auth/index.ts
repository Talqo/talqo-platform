import { db } from "../../db";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";

const authRepository = new AuthRepository(db);
export const authService = new AuthService(authRepository);

export { default as authRoutes } from "./auth.routes";
