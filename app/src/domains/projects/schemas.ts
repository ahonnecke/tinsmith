import { z } from 'zod';

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name required'),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip_code: z.string().nullable().optional(),
  building_type: z.string().optional().default('Multi-Family'),
  num_units: z.number().int().positive().nullable().optional(),
  stories: z.number().int().positive().nullable().optional(),
  year_built: z.number().int().nullable().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
