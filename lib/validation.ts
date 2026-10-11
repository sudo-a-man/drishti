import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Enter a valid email"),
  mobile: z.string().min(8, "Enter a valid mobile number"),
  password: z.string().min(8, "At least 8 characters"),
});

export const signInSchema = z.object({
  id: z.string().email("Enter the email you signed up with"),
  password: z.string().min(1, "Enter your password"),
});

export const checkoutSchema = z.object({
  product: z.enum(["genie", "course", "algorithm", "bundle", "commodity"]).default("genie"),
  planYears: z.coerce.number().int().min(1).max(5).default(1),
});
