import { z } from 'zod';

export const RunCalculationSchema = z.object({
  projectId: z.string().uuid('Invalid project ID'),
});
export type RunCalculationInput = z.infer<typeof RunCalculationSchema>;
