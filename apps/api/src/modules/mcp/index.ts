import { db } from "../../db";
import { McpRepository } from "./mcp.repository";
import { McpService } from "./mcp.service";

const mcpRepository = new McpRepository(db);
export const mcpService = new McpService(mcpRepository);

export { adminMcpRoutes, clientMcpRoutes } from "./mcp.routes";
