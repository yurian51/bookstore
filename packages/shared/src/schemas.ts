import { z } from "zod";
import { SUPPORTED_CURRENCIES } from "./currency";

export const currencySchema = z.enum(SUPPORTED_CURRENCIES);

export const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(120),
  country: z.string().length(2).default("TZ"),
  preferredLanguage: z.enum(["en", "sw", "fr", "es", "ar", "pt", "zh"]).default("en"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const bookInputSchema = z.object({
  title: z.string().min(1).max(300),
  subtitle: z.string().max(300).optional(),
  description: z.string().max(10000).optional(),
  isbn: z.string().regex(/^(97[89])?\d{9}[\dXx]$/, "Invalid ISBN").optional().or(z.literal("")),
  language: z.string().min(2).max(10).default("en"),
  publicationDate: z.string().optional(),
  edition: z.string().max(50).optional(),
  pageCount: z.number().int().positive().optional(),
  categoryIds: z.array(z.string()).default([]),
  authorIds: z.array(z.string()).min(1),
  publisherId: z.string().optional(),
  tableOfContents: z.string().max(20000).optional(),
});

export const priceSchema = z.object({
  currency: currencySchema,
  amountMinor: z.number().int().nonnegative(),
});

export const addToCartSchema = z.object({
  bookId: z.string(),
  formatId: z.string(),
  quantity: z.number().int().min(1).max(20).default(1),
});

export const checkoutSchema = z.object({
  currency: currencySchema,
  shippingAddressId: z.string().optional(),
  couponCode: z.string().max(40).optional(),
});

export const reviewSchema = z.object({
  bookId: z.string(),
  rating: z.number().int().min(1).max(5),
  title: z.string().max(200).optional(),
  body: z.string().max(5000).optional(),
});

export const progressSchema = z.object({
  bookId: z.string(),
  locator: z.string().max(500),
  percent: z.number().min(0).max(100),
});
