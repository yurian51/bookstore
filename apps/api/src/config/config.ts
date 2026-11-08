export const config = {
  port: parseInt(process.env.API_PORT ?? "4000", 10),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  sessionSecret: process.env.SESSION_SECRET ?? "",
  sessionTtlDays: 30,
  signedUrlSecret: process.env.SIGNED_URL_SECRET ?? "",
  signedUrlTtlSeconds: parseInt(process.env.SIGNED_URL_TTL_SECONDS ?? "300", 10),
  storageDir: process.env.STORAGE_DIR ?? "./storage",
  defaultCountry: process.env.DEFAULT_COUNTRY ?? "TZ",
  defaultCurrency: (process.env.DEFAULT_CURRENCY ?? "TZS") as "TZS",
  platformCommissionBps: parseInt(process.env.PLATFORM_COMMISSION_BPS ?? "1000", 10),
  paymentProvider: process.env.PAYMENT_PROVIDER ?? "sandbox",
};

if (process.env.NODE_ENV === "production") {
  for (const key of ["sessionSecret", "signedUrlSecret"] as const) {
    if (!config[key] || config[key].startsWith("change-me")) {
      throw new Error(`Refusing to start in production: ${key} is not set securely`);
    }
  }
}
