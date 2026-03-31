// TODO: swap InMemoryAuthRepository for DrizzleAuthRepository once packages/db is ready
import { InMemoryAuthRepository } from "./auth.repository";
import { createAuthRouter } from "./auth.routes";
import { AuthService } from "./auth.service";

const repo = new InMemoryAuthRepository(); // TODO: new DrizzleAuthRepository(db)
const service = new AuthService(repo);

export const authRouter = createAuthRouter(service);
