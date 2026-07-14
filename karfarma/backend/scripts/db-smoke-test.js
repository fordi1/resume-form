require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const employer = await prisma.employer.create({
    data: {
      email: `db-smoke-${suffix}@example.com`,
      password: "smoke-test-only",
      fullName: "Database Smoke Test",
      jobPositions: {
        create: {
          title: "PostgreSQL Test Job",
          slug: `postgres-smoke-${suffix}`,
          requiredSkills: JSON.stringify(["PostgreSQL", "Node.js"]),
          form: { create: { title: "Smoke Test Form" } },
        },
      },
    },
    include: { jobPositions: { include: { form: true } } },
  });

  const job = employer.jobPositions[0];
  if (!job.form || JSON.parse(job.requiredSkills)[0] !== "PostgreSQL") {
    throw new Error("Create/read relation test failed");
  }

  await prisma.$transaction([
    prisma.jobPosition.update({ where: { id: job.id }, data: { isActive: false } }),
    prisma.employer.update({ where: { id: employer.id }, data: { company: "Smoke Test" } }),
  ]);

  await prisma.employer.delete({ where: { id: employer.id } });
  const cascadedJob = await prisma.jobPosition.findUnique({ where: { id: job.id } });
  if (cascadedJob !== null) throw new Error("Cascade delete test failed");

  console.log("PostgreSQL smoke test passed: CRUD, relations, transaction, and cascade delete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
