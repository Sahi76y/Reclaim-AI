import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string()
    .url()
    .default("postgresql://postgres:postgres@localhost:5432/reclaimai?schema=public"),
  // Razorpay Test Mode credentials (placeholders for future steps)
  RAZORPAY_KEY_ID: z.string().default("rzp_test_placeholder_key_id"),
  RAZORPAY_KEY_SECRET: z.string().default("placeholder_secret"),
  RAZORPAY_WEBHOOK_SECRET: z.string().default("placeholder_webhook_secret"),
  // App URL
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.warn(
    "⚠️ Environment configuration warning. Using fallback development defaults:",
    parsed.error.format()
  );
}

export const env = parsed.success ? parsed.data : envSchema.parse({});
