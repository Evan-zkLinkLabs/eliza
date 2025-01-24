// plugin-otc/actions/createOtcTaskAction.ts
import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    ModelClass,
    State,
    composeContext,
    generateObjectDeprecated,
} from "@elizaos/core";
import { OtcTaskSchema } from "../tasks";
import { InMemoryOtcTaskManager } from "../InMemoryOtcTaskManager";
import { OtcError } from "../types";
import { initializeSharedData } from "../types/sharedData";

const creationPrompt = `Creating a new OTC task. Extract the following JSON:
  \`\`\`json
  {
    "taskId": "<uuid>",
    "title": "Sell BTC",
    "taskType": "SHORT_TERM",
    "description": "Sell BTC in 28000-29000 range within a week",
    "targetPriceRange": [28000, 29000],
    "deadline": 1687526400000
  }
  \`\`\`
  `;

export const createOtcTaskAction: Action = {
    name: "CREATE_OTC_TASK",
    similes: ["create a new OTC task"],
    description: "Owner command: create a new OTC task",
    async validate(runtime: IAgentRuntime, message: Memory, state: State) {
        initializeSharedData(state);
        return true;
    },
    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options,
        callback?: HandlerCallback
    ): Promise<boolean> {
        let result;
        try {
            state = state
                ? await runtime.updateRecentMessageState(state)
                : await runtime.composeState(message);

            const context = composeContext({ state, template: creationPrompt });
            result = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            if (!result?.taskId) {
                throw new OtcError("No taskId found in user's creation data");
            }
            const manager = state.sharedData
                .taskManager as InMemoryOtcTaskManager;
            if (!manager) {
                throw new OtcError("No TaskManager found in sharedData");
            }

            // parse
            const parseResult = OtcTaskSchema.safeParse(result);
            if (!parseResult.success) {
                throw new OtcError(
                    "Invalid task data",
                    parseResult.error.issues
                );
            }
            const newTask = manager.createTask(parseResult.data);

            if (callback) {
                callback({
                    text: `New OTC task created: ${newTask.title} (id: ${newTask.taskId})`,
                    content: newTask,
                });
            }
            return true;
        } catch (error) {
            if (callback) {
                callback({
                    text: `Error creating task: ${error.message}`,
                    content: { error: error.message },
                });
            }
            return false;
        }
    },
    examples: [] as ActionExample[][],
};
