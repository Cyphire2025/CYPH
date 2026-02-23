import { z } from "zod";

// For posting a workroom message
export const postMessageSchema = z.object({
  text: z.string().max(2000, "Message too long").optional(),
  clientTempId: z.string().max(120).optional(),
  // Attachments are handled by multer, so not validated here.
});

// For finalising a workroom (e.g., client/worker confirmation)
export const finaliseWorkroomSchema = z.object({
  // If you want any confirmation flag, e.g.:
  // confirm: z.boolean(),
  // For now, empty schema, since you probably use user/session context.
});
