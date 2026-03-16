import { z } from 'zod';

export const ReplyToSchema = z.object({
  id: z.string().max(50),
  username: z.string().max(20),
  text: z.string().max(200),
}).optional();

export const ChatMessageSchema = z.object({
  id: z.string().max(50),
  username: z.string().max(20),
  text: z.string().max(5000),
  timestamp: z.number(),
  type: z.enum(['message', 'system', 'announcement']),
  status: z.enum(['sent', 'delivered', 'read']).optional(),
  edited: z.boolean().optional(),
  deleted: z.boolean().optional(),
  imageUrl: z.string().url().max(2000).optional(),
  imageExpiry: z.number().optional(),
  isGif: z.boolean().optional(),
  fileUrl: z.string().url().max(2000).optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().optional(),
  fileMimeType: z.string().max(100).optional(),
  replyTo: ReplyToSchema,
});

export const TypingSchema = z.object({ username: z.string().max(20) });
export const ReadSchema = z.object({ messageId: z.string().max(50), reader: z.string().max(20) });
export const BulkReadSchema = z.object({ messageIds: z.array(z.string().max(50)), reader: z.string().max(20) });
export const FreezeSchema = z.object({ frozen: z.boolean(), by: z.string().max(20) });
export const EditSchema = z.object({ messageId: z.string().max(50), newText: z.string().max(5000) });
export const UnsendSchema = z.object({ messageId: z.string().max(50) });
export const KickSchema = z.object({ username: z.string().max(20) });

export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn('Invalid broadcast payload rejected:', result.error.message);
    return null;
  }
  return result.data;
}
