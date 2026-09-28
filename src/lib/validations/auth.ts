import { z } from "zod";

// ─────────── SHARED RULES ───────────
const nameRules = z
  .string()
  .trim()
  .min(1, "Full name is required")
  .min(2, "Name must be at least 2 characters")
  .max(50, "Name is too long");

const emailRules = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

const passwordRules = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain at least one uppercase letter")
  .regex(/[a-z]/, "Must contain at least one lowercase letter")
  .regex(/[0-9]/, "Must contain at least one number");

// ─────────── LOGIN ───────────
export const loginSchema = z.object({
  email: emailRules,
  password: z
    .string()
    .min(1, "Password is required")
    .min(6, "Password must be at least 6 characters"),
  remember: z.boolean().default(false),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

// ─────────── SIGNUP ───────────
export const signupSchema = z
  .object({
    name: nameRules,
    email: emailRules,
    password: passwordRules,
    confirm: z.string().min(1, "Please confirm your password"),
    agree: z.boolean().refine((v) => v === true, {
      message: "You must accept the terms",
    }),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

// ─────────── ADMIN: ADD USER ───────────
export const addUserSchema = z.object({
  name: nameRules,
  email: emailRules,
  password: passwordRules,
});

// ─────────── ADMIN: EDIT USER (blank password = keep current) ───────────
export const editUserSchema = z.object({
  name: nameRules,
  email: emailRules,
  password: z.string().superRefine((val, ctx) => {
    if (val === "") return;
    const r = passwordRules.safeParse(val);
    if (!r.success) {
      ctx.addIssue({ code: "custom", message: r.error.issues[0].message });
    }
  }),
});

export type AddUserValues = z.infer<typeof addUserSchema>;
export type EditUserValues = z.infer<typeof editUserSchema>;