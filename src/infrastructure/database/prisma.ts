import { PrismaClient } from '@prisma/client';
import { logger } from '../../config/logger';

export const prisma = new PrismaClient();
