// plugin-otc/actions/ownerListTasksAction.ts
import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { InMemoryOtcTaskManager } from "../InMemoryOtcTaskManager";

export const ownerListTasksAction: Action = {
    similes: ["list tasks", "show tasks", "view tasks"],
    validate: async (_runtime, _message, _state) => true,
    examples: [] as ActionExample[][],
    name: "OWNER_LIST_TASKS",
    description: "Owner command: list all tasks",
    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options,
        callback?: HandlerCallback
    ): Promise<boolean> {
        const manager = state.sharedData.taskManager as InMemoryOtcTaskManager;
        if (!manager) {
            if (callback)
                callback({ text: "No TaskManager found", content: {} });
            return false;
        }
        const tasks = manager.listTasks();
        if (callback) {
            callback({
                text:
                    "All tasks:\n" +
                    tasks
                        .map((t) => `• ${t.taskId}: ${t.title} [${t.status}]`)
                        .join("\n"),
                content: tasks,
            });
        }
        return true;
    },
};
