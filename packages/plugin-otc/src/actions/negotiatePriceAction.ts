// plugin-otc/actions/negotiatePriceAction.ts
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
import { OtcError } from "../types";
import { initializeSharedData } from "../types/sharedData";
import { InMemoryOtcTaskManager } from "../InMemoryOtcTaskManager";
import { decideNextStep } from "../negotiationStrategy";

const negotiationPrompt = `A new price offer has been provided. Extract in JSON:
  \`\`\`json
  {
    "offeredPrice": 950,
    "notes": "some optional notes"
  }
  \`\`\`
  `;

export const negotiatePriceAction: Action = {
    name: "NEGOTIATE_OTC_PRICE",
    similes: ["negotiate price", "offer price", "offer new price"],
    description:
        "OTC Negotiator: parse new offered price and update the ongoing task.",
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
        try {
            state = state
                ? await runtime.updateRecentMessageState(state)
                : await runtime.composeState(message);

            const context = composeContext({
                state,
                template: negotiationPrompt,
            });
            const result = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            });

            if (!result?.offeredPrice) {
                throw new OtcError(
                    "Could not parse offeredPrice from conversation"
                );
            }

            // We need a target taskId from somewhere (like in state or meta). Example:
            const taskId = state.sharedData.currentTaskId;
            if (!taskId) {
                throw new OtcError("No currentTaskId in sharedData");
            }

            const manager = state.sharedData
                .taskManager as InMemoryOtcTaskManager;
            const task = manager.getTask(taskId);
            if (!task) {
                throw new OtcError(`Task not found: ${taskId}`);
            }

            // Update negotiation context
            const newRound = {
                offeredPrice: Number(result.offeredPrice),
                notes: result.notes || "",
            };
            const oldContext = task.negotiationContext || { 
                rounds: [],
                itemName: task.title,
                baseCurrency: "USDT"
            };
            oldContext.rounds.push(newRound);
            
            // Use negotiation strategy to decide next step
            const decision = decideNextStep(
                newRound.offeredPrice,
                oldContext,
                task.targetPriceRange as [number, number]
            );
            
            const status = decision.accept ? "ACCEPTED" : "IN_PROGRESS";
            manager.updateTask(taskId, {
                negotiationContext: oldContext,
                status,
            });

            if (callback) {
                const responseText = decision.accept
                    ? `Accepting the offer of ${newRound.offeredPrice} ${oldContext.baseCurrency}. ${decision.reason}`
                    : `Current offer: ${newRound.offeredPrice} ${oldContext.baseCurrency}. ${decision.reason}${
                        decision.counterOffer 
                            ? `. Counter-offering: ${decision.counterOffer} ${oldContext.baseCurrency}`
                            : ""
                    }`;
                
                callback({
                    text: responseText,
                    content: { 
                        newRound,
                        decision,
                        updatedTask: manager.getTask(taskId)
                    },
                });
            }
            return true;
        } catch (error) {
            if (callback) {
                callback({
                    text: `Error in negotiation: ${error.message}`,
                    content: {},
                });
            }
            return false;
        }
    },
    examples: [] as ActionExample[][],
};
