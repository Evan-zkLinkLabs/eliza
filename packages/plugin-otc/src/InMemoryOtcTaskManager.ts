// plugin-otc/tasksManagerImpl.ts
import { OtcTask, OtcTaskSchema, OtcTaskManager } from "./tasks";

export class InMemoryOtcTaskManager implements OtcTaskManager {
    private tasks: Record<string, OtcTask> = {};

    createTask(taskData: OtcTask): OtcTask {
        const validated = OtcTaskSchema.parse(taskData);
        this.tasks[validated.taskId] = validated;
        return validated;
    }

    updateTask(taskId: string, partial: Partial<OtcTask>): OtcTask | undefined {
        const existing = this.tasks[taskId];
        if (!existing) return undefined;
        const merged = { ...existing, ...partial };
        const validated = OtcTaskSchema.parse(merged);
        this.tasks[taskId] = validated;
        return validated;
    }

    getTask(taskId: string): OtcTask | undefined {
        return this.tasks[taskId];
    }

    listTasks(): OtcTask[] {
        return Object.values(this.tasks);
    }

    finalizeTask(taskId: string, reason?: string): boolean {
        const existing = this.tasks[taskId];
        if (!existing) return false;
        existing.status = "FINALIZED";
        this.tasks[taskId] = existing;
        return true;
    }
}
