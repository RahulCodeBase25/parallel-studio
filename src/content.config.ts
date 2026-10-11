import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'

const work = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/work' }),
  schema: z.object({
    client: z.string(),
    title: z.string(),
    year: z.number(),
    order: z.number(),
    services: z.array(z.string()),
    platform: z.enum(['mobile', 'web', 'dashboard']),
    theme: z.object({ bg: z.string(), fg: z.string(), accent: z.string(), surface: z.string() }),
    results: z.array(z.object({ value: z.string(), label: z.string() })),
  }),
})

export const collections = { work }
