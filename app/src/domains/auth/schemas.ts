import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1, 'Email required').trim().toLowerCase().email('Invalid email'),
  password: z.string().optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().min(1).trim().toLowerCase().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name required'),
  organizationName: z.string().min(1, 'Organization name required'),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;
