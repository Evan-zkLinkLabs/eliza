// plugin-otc/tasks.ts
import { z } from "zod";
import { NegotiationContextSchema } from "./types";

export const TaskTypeSchema = z.enum(["IMMEDIATE", "SHORT_TERM", "LONG_TERM"]);
export const TaskStatusSchema = z.enum([
    "CREATED",
    "IN_PROGRESS",
    "ACCEPTED",
    "FINALIZED",
    "ARCHIVED",
]);

export const OtcTaskSchema = z.object({
    taskId: z.string().uuid(),
    taskType: TaskTypeSchema,
    title: z.string().min(1),
    description: z.string().optional(),
    targetPriceRange: z.tuple([z.number(), z.number()]).optional(),
    deadline: z.number().optional(),
    createdAt: z.number().default(Date.now()),
    status: TaskStatusSchema.default("CREATED"),
    negotiationContext: NegotiationContextSchema.optional(),
    chosenProtocol: z.string().optional(),
    transactionId: z.string().optional(),
});

export type OtcTask = z.infer<typeof OtcTaskSchema>;

export interface OtcTaskManager {
    createTask(taskData: OtcTask): OtcTask;
    updateTask(taskId: string, partial: Partial<OtcTask>): OtcTask | undefined;
    getTask(taskId: string): OtcTask | undefined;
    listTasks(): OtcTask[];
    finalizeTask(taskId: string, reason?: string): boolean;
}
