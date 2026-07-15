import { z } from 'zod';

export const CreateUnitSchema = z.object({
  name: z.string().min(1, 'Name required'),
  unit_type: z.string().nullable().optional(),
  bedrooms: z.number().int().nonnegative().nullable().optional(),
  floor_area: z.number().positive().nullable().optional(),
  building_parameters: z.record(z.string(), z.unknown()).nullable().optional(),
  load_data: z.record(z.string(), z.unknown()).nullable().optional(),
});
export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;
