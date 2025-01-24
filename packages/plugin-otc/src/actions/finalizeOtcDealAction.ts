// plugin-otc/actions/finalizeOtcDealAction.ts
import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@elizaos/core";
import { OtcError } from "../types";
import { InMemoryOtcTaskManager } from "../InMemoryOtcTaskManager";

const finalizePrompt = `We are about to finalize this OTC deal. Provide a JSON object with:
  \`\`\`json
  {
    "finalPrice": 980,
    "chosenProtocol": "htlc",
    "notes": "We both agreed to finalize at 980 USDT"
  }
  \`\`\`
  `;

export const finalizeOtcDealAction: Action = {
    name: "FINALIZE_OTC_DEAL",
    similes: ["finalize", "finalize deal", "finalize otc deal"],
    description:
        "OTC Negotiator: finalize the deal by setting final price and chosen protocol.",
    async validate(runtime: IAgentRuntime, message: Memory, state: State) {
        if (!state.sharedData.currentTaskId) {
            throw new OtcError("No currentTaskId in sharedData");
        }
        const manager = state.sharedData.taskManager as InMemoryOtcTaskManager;
        const task = manager.getTask(state.sharedData.currentTaskId);
        if (!task) {
            throw new OtcError(
                `No such task: ${state.sharedData.currentTaskId}`
            );
        }
        if (task.status !== "accepted") {
            throw new OtcError(
                `Cannot finalize task in status: ${task.status}`
            );
        }
        return true;
    },
    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options,
        callback?: HandlerCallback
    ): Promise<boolean> {
        try {
            state = state
                ? await runtime.updateRecentMessageState(state)
                : await runtime.composeState(message);

            const context = composeContext({ state, template: finalizePrompt });
            const result = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });
            if (!result?.finalPrice || !result?.chosenProtocol) {
                throw new OtcError("Missing finalPrice or chosenProtocol");
            }

            const taskId = state.sharedData.currentTaskId;
            if (!taskId) {
                throw new OtcError("No currentTaskId in sharedData");
            }
            const manager = state.sharedData
                .taskManager as InMemoryOtcTaskManager;
            const task = manager.getTask(taskId);
            if (!task) {
                throw new OtcError(`No such task: ${taskId}`);
            }

            // update
            manager.updateTask(taskId, {
                chosenProtocol: result.chosenProtocol,
            });
            manager.finalizeTask(taskId, result.notes);

            if (callback) {
                callback({
                    text: `OTC deal finalized at ${result.finalPrice} using protocol: ${result.chosenProtocol}\nNotes: ${result.notes}`,
                    content: manager.getTask(taskId),
                });
            }
            return true;
        } catch (error) {
            if (callback) {
                callback({
                    text: `Error finalizing deal: ${error.message}`,
                    content: {},
                });
            }
            return false;
        }
    },
};
