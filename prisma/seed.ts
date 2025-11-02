import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log(`🌱 Start seeding ...`);

  // --- Seed Users ---
  console.log(`👤 Seeding users...`);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      name: "Administrator Utama",
      password: "TrustDigital2024!", // TODO: hash di production
      role: "admin",
    },
  });

  await prisma.user.upsert({
    where: { username: "operator1" },
    update: {},
    create: {
      username: "operator1",
      name: "Operator Satu",
      password: "Operator123!", // TODO: hash di production
      role: "operator",
    },
  });

  console.log(`✅ Users seeded: admin, operator1`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
