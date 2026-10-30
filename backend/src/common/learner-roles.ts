import { Role } from '@prisma/client';

export const LEARNER_ROLES: Role[] = [Role.STUDENT, Role.CUSTOMER];
export const isLearnerRole = (role?: Role | null) => role === Role.STUDENT || role === Role.CUSTOMER;
