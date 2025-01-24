// plugin-otc/actions/finalizeOtcDealAction.ts
import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@elizaos/core";
import { OtcError } from "../types";
import { initializeSharedData } from "../types/sharedData";
import { InMemoryOtcTaskManager } from "../InMemoryOtcTaskManager";
import { sampleProtocols } from "./listProtocolsAction";
import { executeTransaction } from "../transactionExecutor";

const finalizePrompt = `Finalizing the OTC deal. Provide a JSON object with:
  \`\`\`json
  {
    "finalPrice": 980,
    "chosenProtocol": "htlc",
    "notes": "Agreement reached at 980 USDT"
  }
  \`\`\`
  `;

export const finalizeOtcDealAction: Action = {
    examples: [] as ActionExample[][],
    name: "FINALIZE_OTC_DEAL",
    similes: ["finalize", "finalize deal", "finalize otc deal"],
    description:
        "OTC Negotiator: finalize the deal by setting final price and chosen protocol.",
    async validate(runtime: IAgentRuntime, message: Memory, state: State) {
        initializeSharedData(state);
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
        if (task.status !== "ACCEPTED") {
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

            // Validate chosen protocol
            const validProtocol = sampleProtocols.find(
                (proto) => proto.protocolId === result.chosenProtocol
            );
            if (!validProtocol) {
                throw new OtcError(`Invalid protocol: ${result.chosenProtocol}`);
            }

            // Execute transaction
            const transactionResult = await executeTransaction(
                result.finalPrice,
                validProtocol.protocolId,
                task.negotiationContext?.baseCurrency
            );

            if (!transactionResult.success) {
                throw new OtcError(
                    `Transaction failed: ${transactionResult.error || "Unknown error"}`
                );
            }

            // Update with validated protocol and transaction details
            manager.updateTask(taskId, {
                chosenProtocol: validProtocol.protocolId,
                transactionId: transactionResult.transactionId,
            });
            manager.finalizeTask(taskId, 
                `${result.notes}\nTransaction ID: ${transactionResult.transactionId}`
            );

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
