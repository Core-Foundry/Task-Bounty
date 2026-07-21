import { z } from 'zod';

export const taskSchema = z.object({
  title: z
    .string()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title must be at most 100 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  tokenAddress: z
    .string()
    .length(56, 'Token address must be exactly 56 characters')
    .startsWith('G', "Token address must start with 'G'"),
  reward: z.coerce
    .number()
    .int()
    .positive('Reward must be strictly greater than zero'),
  deadline: z.coerce.date().refine((date) => date.getTime() > Date.now(), {
    message: 'Deadline must be in the future',
  }),
  maxSubmissions: z.coerce
    .number()
    .int()
    .min(1, 'Max submissions must be at least 1'),
});

export type TaskValidationType = z.infer<typeof taskSchema>;
