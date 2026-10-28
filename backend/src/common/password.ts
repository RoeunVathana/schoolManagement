import { BadRequestException } from '@nestjs/common';

export const isStrongPassword = (value: unknown) => typeof value === 'string' && value.length >= 10 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value) && /[^A-Za-z\d]/.test(value);

export function assertStrongPassword(value: unknown) {
  if (!isStrongPassword(value)) throw new BadRequestException('Password must be at least 10 characters and include uppercase, lowercase, number and special character.');
}
