import { z } from "zod";

export const adminLoginSchema = z
  .object({
    email: z.string().trim().email("Invalid email address").max(254),
    password: z.string().min(1, "Password is required").max(256),
    secret: z.string().min(1, "Secret is required").max(256),
  })
  .strict();
