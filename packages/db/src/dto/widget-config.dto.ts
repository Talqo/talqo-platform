import { createSelectSchema } from "drizzle-zod"
import { z } from "zod"
import { widgetConfigs } from "../schema/client"

export const widgetConfigResponseSchema = createSelectSchema(widgetConfigs, {
	updatedAt: z.string(),
})

export type WidgetConfigResponse = z.infer<typeof widgetConfigResponseSchema>
