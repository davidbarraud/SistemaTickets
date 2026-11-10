import { prisma } from '../../src/db';
import { resetDb } from '../helpers/db';

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});
