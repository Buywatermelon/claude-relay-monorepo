import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional()
});

export const joinWorkspaceSchema = z.object({
  join_code: z.string().min(1)
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'member'])
});

export const workspaceIdParamSchema = z.object({
  id: z.string().uuid()
});

export const membershipIdParamSchema = z.object({
  id: z.string().uuid(),
  membershipId: z.string().uuid()
});