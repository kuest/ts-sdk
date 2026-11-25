import { z } from 'zod';
import {
  CommentMediaSchema,
  CommentProfileSchema,
  CommentSchema,
  ReactionSchema,
} from '../gamma/comment';
import {
  CommentParentEntityTypeSchema,
  EpochMillisecondsSchema,
} from '../shared';

const CommentRemovedPayloadSchema = z.object({
  id: z.string(),
  body: z.string().nullish(),
  parentEntityType: CommentParentEntityTypeSchema.nullish(),
  parentEntityID: z.number().int().nullish(),
  parentCommentID: z.string().nullish(),
  userAddress: z.string().nullish(),
  replyAddress: z.string().nullish(),
  createdAt: z.string().nullish(),
  updatedAt: z.string().nullish(),
  media: z.array(CommentMediaSchema).nullish(),
  profile: CommentProfileSchema.nullish(),
  reactions: z.array(ReactionSchema).nullish(),
  reportCount: z.number().int().nullish(),
  reactionCount: z.number().int().nullish(),
  tradeAsset: z.string().nullish(),
});

export type CommentRemovedPayload = z.infer<typeof CommentRemovedPayloadSchema>;

export const CommentCreatedEventSchema = z.object({
  topic: z.literal('comments'),
  type: z.literal('comment_created'),
  timestamp: EpochMillisecondsSchema,
  payload: CommentSchema,
});

export type CommentCreatedEvent = z.infer<typeof CommentCreatedEventSchema>;

export const CommentRemovedEventSchema = z.object({
  topic: z.literal('comments'),
  type: z.literal('comment_removed'),
  timestamp: EpochMillisecondsSchema,
  payload: CommentRemovedPayloadSchema,
});

export type CommentRemovedEvent = z.infer<typeof CommentRemovedEventSchema>;

export const ReactionCreatedEventSchema = z.object({
  topic: z.literal('comments'),
  type: z.literal('reaction_created'),
  timestamp: EpochMillisecondsSchema,
  payload: ReactionSchema,
});

export type ReactionCreatedEvent = z.infer<typeof ReactionCreatedEventSchema>;

export const ReactionRemovedEventSchema = z.object({
  topic: z.literal('comments'),
  type: z.literal('reaction_removed'),
  timestamp: EpochMillisecondsSchema,
  payload: ReactionSchema,
});

export type ReactionRemovedEvent = z.infer<typeof ReactionRemovedEventSchema>;

export const CommentsEventSchema = z.discriminatedUnion('type', [
  CommentCreatedEventSchema,
  CommentRemovedEventSchema,
  ReactionCreatedEventSchema,
  ReactionRemovedEventSchema,
]);

export type CommentsEvent = z.infer<typeof CommentsEventSchema>;

export const RealtimeEventSchema = CommentsEventSchema;

export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;
