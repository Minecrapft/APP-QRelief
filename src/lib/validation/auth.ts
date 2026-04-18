import { z } from "zod";

const emailSchema = z.email("Enter a valid email address.");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.")
});

export const beneficiaryIntakeSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  contactNumber: z.string().trim().min(7, "Contact number is required."),
  address: z.string().trim().min(8, "Address is required."),
  householdSize: z
    .string()
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 1, "Household size must be at least 1."),
  governmentId: z.string().trim().min(4, "Government ID is required.")
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema
});

export const passwordUpdateSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords must match.",
    path: ["confirmPassword"]
  });

export const signUpSchema = z
  .object({
    role: z.enum(["beneficiary", "staff"]),
    fullName: z.string().min(2, "Full name is required."),
    email: emailSchema,
    password: passwordSchema,
    contactNumber: z.string(),
    address: z.string(),
    householdSize: z.string(),
    governmentId: z.string(),
    inviteCode: z.string()
  })
  .superRefine((value, ctx) => {
    if (value.role !== "beneficiary") {
      if (value.inviteCode.trim().length < 6) {
        ctx.addIssue({
          code: "custom",
          path: ["inviteCode"],
          message: "Staff registration requires a valid invitation code."
        });
      }
      return;
    }

    if (value.contactNumber.trim().length < 7) {
      ctx.addIssue({
        code: "custom",
        path: ["contactNumber"],
        message: "Contact number is required for beneficiary accounts."
      });
    }

    if (value.address.trim().length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Address is required for beneficiary accounts."
      });
    }

    const householdSize = Number(value.householdSize);

    if (!Number.isFinite(householdSize) || householdSize < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["householdSize"],
        message: "Household size must be at least 1."
      });
    }

    if (value.governmentId.trim().length < 4) {
      ctx.addIssue({
        code: "custom",
        path: ["governmentId"],
        message: "Government ID is required for beneficiary accounts."
      });
    }
  });
