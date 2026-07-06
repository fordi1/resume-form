// اتصال مشترک به دیتابیس از طریق Prisma Client
// در کل پروژه فقط همین یک نمونه استفاده می‌شود.
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;
