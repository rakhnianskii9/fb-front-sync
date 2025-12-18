import { z } from "zod";

// User types
export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  theme: string;
  language: string;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const insertUserSchema = z.object({
  email: z.string().email(),
  name: z.string(),
  role: z.string().default('user'),
  avatar: z.string().optional(),
  theme: z.string().default('dark'),
  language: z.string().default('ru'),
  notificationsEnabled: z.boolean().default(true),
});

export type InsertUser = z.infer<typeof insertUserSchema>;

// Note related types
export const noteRelatedToSchema = z.object({
  type: z.enum(['campaign', 'adset', 'ad', 'creative']),
  id: z.string(),
  name: z.string(),
});

export const aiInsightsSchema = z.object({
  confidence: z.number().min(0).max(100),
  dataPeriod: z.string(),
  keyMetrics: z.array(z.object({
    name: z.string(),
    value: z.string(),
    change: z.string(),
  })),
  suggestedAction: z.string(),
});

export const noteSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: z.enum(['user', 'ai']),
  title: z.string(),
  description: z.string(),
  priority: z.enum(['high', 'medium', 'low', 'none']),
  status: z.enum(['pending', 'in_progress', 'completed', 'closed']),
  relatedTo: z.array(noteRelatedToSchema),
  tags: z.array(z.string()),
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deadline: z.string().optional(),
  whatsappReminder: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  pinned: z.boolean(),
  aiInsights: aiInsightsSchema.optional(),
});

export const insertNoteSchema = noteSchema.omit({ id: true, createdAt: true, updatedAt: true });

export type Note = z.infer<typeof noteSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type NoteRelatedTo = z.infer<typeof noteRelatedToSchema>;
export type AIInsights = z.infer<typeof aiInsightsSchema>;

// Dataset types
export interface Dataset {
  id: string;
  datasetId: string;
  userId: number;
  pixelId: string;
  name: string;
  status: string;
  canProxy: boolean;
  enableAutomaticMatching: boolean;
  createdTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const insertDatasetSchema = z.object({
  id: z.string(),
  datasetId: z.string(),
  userId: z.number(),
  pixelId: z.string(),
  name: z.string(),
  status: z.string(),
  canProxy: z.boolean().default(false),
  enableAutomaticMatching: z.boolean().default(false),
  createdTime: z.string().optional(),
});

export type InsertDataset = z.infer<typeof insertDatasetSchema>;

// Event types
export interface Event {
  id: string;
  eventId: string;
  userId: number;
  pixelId: string;
  name: string;
  type: string;
  status: string;
  lastFiredTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const insertEventSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  userId: z.number(),
  pixelId: z.string(),
  name: z.string(),
  type: z.string(),
  status: z.string(),
  lastFiredTime: z.string().optional(),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;

// SystemUser types
export interface SystemUser {
  id: string;
  systemUserId: string;
  userId: number;
  name: string;
  role: string;
  businessId?: string;
  createdTime?: string;
  createdAt: Date;
  updatedAt: Date;
}

export const insertSystemUserSchema = z.object({
  id: z.string(),
  systemUserId: z.string(),
  userId: z.number(),
  name: z.string(),
  role: z.string(),
  businessId: z.string().optional(),
  createdTime: z.string().optional(),
});

export type InsertSystemUser = z.infer<typeof insertSystemUserSchema>;

// Token types
export interface Token {
  id: string;
  userId: number;
  systemUserId?: string;
  name: string;
  accessToken?: string;
  scope: string[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const insertTokenSchema = z.object({
  id: z.string(),
  userId: z.number(),
  systemUserId: z.string().optional(),
  name: z.string(),
  accessToken: z.string().optional(),
  scope: z.array(z.string()).default([]),
  expiresAt: z.date().optional(),
});

export type InsertToken = z.infer<typeof insertTokenSchema>;
