import { z } from 'zod';
import { MUSCLES } from '../constants/muscles.js';

export const exerciseSchema = z.object({
  name: z.string().min(1, 'Название обязательно').max(200),
  emoji: z.string().default('🏋️'),
  muscles: z.array(z.object({
    name: z.enum(/** @type {[string, ...string[]]} */ (MUSCLES)),
    is_primary: z.boolean().default(false),
  })).min(1, 'Укажите хотя бы одну мышечную группу')
    .refine(arr => arr.some(m => m.is_primary), { message: 'Укажите хотя бы одну основную мышечную группу' }),
  technique_notes: z.string().default(''),
  rest_timer_seconds: z.number().int().min(0).default(90),
});
