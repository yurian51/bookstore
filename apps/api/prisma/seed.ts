/**
 * DEVELOPMENT SEED DATA ONLY. Refuses to run against production.
 * Creates a few clearly-labelled demo books so the storefront is not empty.
 * Demo titles are fictional placeholders; nothing here is real book metadata.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/crypto";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to seed in production");
  }

  const adminPass = await hashPassword("ChangeMe-Dev-123");

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.local" },
    update: {},
    create: {
      email: "admin@demo.local",
      name: "Demo Admin",
      country: "TZ",
      passwordHash: adminPass,
      roles: { create: [{ role: "ADMIN" }, { role: "CUSTOMER" }] },
    },
  });

  const authorUser = await prisma.user.upsert({
    where: { email: "author@demo.local" },
    update: {},
    create: {
      email: "author@demo.local",
      name: "Demo Author",
      country: "TZ",
      passwordHash: adminPass,
      roles: { create: [{ role: "AUTHOR" }, { role: "CUSTOMER" }] },
    },
  });

  const author = await prisma.authorProfile.upsert({
    where: { userId: authorUser.id },
    update: {},
    create: { userId: authorUser.id, displayName: "Demo Author (DEV)", country: "TZ", bio: "Placeholder author profile for development." },
  });

  const publisher = await prisma.publisher.create({
    data: { name: "Demo Publishing House (DEV)", country: "TZ", featured: true },
  });

  const fiction = await prisma.category.upsert({
    where: { slug: "fiction" },
    update: {},
    create: { slug: "fiction", name: "Fiction", sortOrder: 1 },
  });
  const tech = await prisma.category.upsert({
    where: { slug: "technology" },
    update: {},
    create: { slug: "technology", name: "Technology & Computer Science", sortOrder: 2 },
  });
  await prisma.category.upsert({
    where: { slug: "artificial-intelligence" },
    update: {},
    create: { slug: "artificial-intelligence", name: "Artificial Intelligence", parentId: tech.id, sortOrder: 1 },
  });

  const demoBooks = [
    { slug: "demo-river-of-letters", title: "The River of Letters (DEV)", cat: fiction.id, price: 25000, featured: true },
    { slug: "demo-coding-the-coast", title: "Coding the Coast (DEV)", cat: tech.id, price: 35000, featured: false },
  ];

  for (const b of demoBooks) {
    const book = await prisma.book.upsert({
      where: { slug: b.slug },
      update: {},
      create: {
        slug: b.slug,
        title: b.title,
        description: "Demo record for development. Not a real publication.",
        language: "en",
        status: "PUBLISHED",
        featured: b.featured,
        publishedAt: new Date(),
        publisherId: publisher.id,
        authors: { create: [{ authorId: author.id, position: 0 }] },
        categories: { create: [{ categoryId: b.cat }] },
        formats: {
          create: [
            { type: "PHYSICAL", priceMinor: b.price, currency: "TZS", isDigital: false },
            { type: "EPUB", priceMinor: Math.round(b.price * 0.6), currency: "TZS", isDigital: true },
          ],
        },
      },
    });
    console.log(`seeded ${book.slug}`);
  }

  await prisma.taxRate.upsert({
    where: { country: "TZ" },
    update: {},
    create: { country: "TZ", rateBps: 1800, name: "VAT" },
  });

  console.log(`seeded admin=${admin.email} (DEV PASSWORD: ChangeMe-Dev-123, change before any shared use)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
