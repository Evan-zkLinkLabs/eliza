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
import {
    decideNextStep,
    ExtendedNegotiationContext,
    DecideOptions,
} from "../negotiationStrategy";
import { TaskStatusSchemaType } from "../tasks";

/**
 * Prompt to parse the newly offered price data in JSON form,
 * potentially including token details (symbol, decimals, chain address).
 */
const negotiationPrompt = `A user provided a new price offer, possibly referencing token details (symbol, decimals, chain address).
We want to extract:
\`\`\`json
{
  "offeredPrice": 950,
  "notes": "some optional notes",
  "tokenSymbol": "USDT",
  "tokenDecimals": 6,
  "tokenAddress": "0x1234abcd... if user mentioned it",
  "priceUnit": "USDT" // or "BUSD" or another base currency
}
\`\`\`

If user didn't mention decimals or address, fill with defaults or leave them blank.

Recent conversation:
{{recentMessages}}`;

export const negotiatePriceAction: Action = {
    name: "NEGOTIATE_OTC_PRICE",
    similes: ["negotiate price", "offer price", "offer new price"],
    description:
        "OTC Negotiator: parse new offered price, token details, and update the ongoing task context (with advanced negotiation logic).",

    async validate(runtime: IAgentRuntime, message: Memory, state: State) {
        initializeSharedData(state);
        return true;
    },

    async handler(
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options,
        callback?: HandlerCallback,
    ): Promise<boolean> {
        try {
            // Ensure we have up-to-date state
            state = state
                ? await runtime.updateRecentMessageState(state)
                : await runtime.composeState(message);

            // Compose the prompt context and parse user input
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
                    "Could not parse 'offeredPrice' from conversation.",
                );
            }

            // Retrieve currentTaskId from sharedData
            const taskId = state.sharedData.currentTaskId;
            if (!taskId) {
                throw new OtcError(
                    "No currentTaskId in sharedData - unable to update negotiation.",
                );
            }

            // Access the TaskManager & fetch relevant task
            const manager = state.sharedData
                .taskManager as InMemoryOtcTaskManager;
            const task = manager.getTask(taskId);
            if (!task) {
                throw new OtcError(`Task not found: ${taskId}`);
            }

            // Create or update negotiation context (extended for advanced logic)
            const oldContext = (task.negotiationContext || {
                rounds: [],
                itemName: task.title,
                baseCurrency: result.priceUnit || "USDT",
            }) as ExtendedNegotiationContext;

            // Insert new round with offeredPrice & optional fields
            const newRound = {
                offeredPrice: Number(result.offeredPrice),
                notes: result.notes || "",
                tokenSymbol: result.tokenSymbol || oldContext.baseCurrency,
                tokenDecimals: result.tokenDecimals || 6,
                tokenAddress: result.tokenAddress || "",
                priceUnit: result.priceUnit || oldContext.baseCurrency,
            };
            oldContext.rounds.push(newRound);

            // If user changed the base currency
            oldContext.baseCurrency = newRound.priceUnit;

            // Decide next step using advanced negotiation logic
            // e.g. maximum 5 rounds, allow up to 2 repeated low offers
            const decision = decideNextStep(
                newRound.offeredPrice,
                oldContext,
                task.targetPriceRange as [number, number],
                {
                    negotiationMaxRounds: 5,
                    maxLowOfferRepeats: 2,
                } as DecideOptions,
            );

            // Derive new status from decision
            let newStatus = "IN_PROGRESS";
            if (decision.accept) {
                newStatus = "ACCEPTED";
            } else if (decision.decline) {
                newStatus = "DECLINED";
            }

            // Update task in manager
            manager.updateTask(taskId, {
                negotiationContext: oldContext,
                status: newStatus as TaskStatusSchemaType,
            });

            if (callback) {
                // Construct response text
                let responseText: string;

                if (decision.decline) {
                    responseText = `We have to decline this offer: ${decision.reason}`;
                } else if (decision.accept) {
                    responseText = `Accepting the offer of ${newRound.offeredPrice} ${newRound.tokenSymbol}. ${decision.reason}`;
                } else {
                    // We remain in negotiation
                    responseText =
                        `Current offer: ${newRound.offeredPrice} ${newRound.tokenSymbol}. ${decision.reason}` +
                        (decision.counterOffer
                            ? `. Counter-offering: ${decision.counterOffer} ${newRound.tokenSymbol}`
                            : "");
                }

                callback({
                    text: responseText,
                    content: {
                        newRound,
                        decision,
                        updatedTask: manager.getTask(taskId),
                    },
                });
            }
            return true;
        } catch (error) {
            if (callback) {
                callback({
                    text: `Error in negotiation: ${(error as Error).message}`,
                    content: {},
                });
            }
            return false;
        }
    },

    examples: [
        [
            // Example 1
            {
                user: "{{user1}}",
                content: {
                    text: "I'd like to offer 920 USDT for your NFT. I'm using address 0xABCD... on chain XYZ.",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Understood. Let me parse that new offer and update the negotiation context.",
                    action: "NEGOTIATE_OTC_PRICE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Current offer: 920 USDT. Below minimum threshold of 950. Counter-offering: 950 USDT",
                    content: {
                        newRound: {
                            offeredPrice: 920,
                            notes: "",
                            tokenSymbol: "USDT",
                            tokenDecimals: 6,
                            tokenAddress: "0xABCD...",
                            priceUnit: "USDT",
                        },
                        decision: {
                            accept: false,
                            decline: false,
                            reason: "Below minimum threshold of 950",
                            counterOffer: 950,
                        },
                        updatedTask: {
                            // ... updated task snippet
                        },
                    },
                },
            },
        ],
        [
            // Example 2
            {
                user: "{{user2}}",
                content: {
                    text: "I'll raise it to 970 BUSD, is that acceptable?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me record your new price offer.",
                    action: "NEGOTIATE_OTC_PRICE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Accepting the offer of 970 BUSD. Within targetPriceRange [950, 1000].",
                    content: {
                        newRound: {
                            offeredPrice: 970,
                            notes: "",
                            tokenSymbol: "BUSD",
                            tokenDecimals: 18,
                            tokenAddress: "",
                            priceUnit: "BUSD",
                        },
                        decision: {
                            accept: true,
                            decline: false,
                            reason: "Within targetPriceRange [950, 1000]",
                            counterOffer: undefined,
                        },
                    },
                },
            },
        ],
        [
            // Example 3
            {
                user: "{{user1}}",
                content: {
                    text: "I can only pay 450. Symbol TST, decimals=2, no official address. That's final.",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me parse this new price offer. Checking if we can proceed.",
                    action: "NEGOTIATE_OTC_PRICE",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "We have to decline this offer: Offer 450 is repeatedly below minimum 550. We decline.",
                    content: {
                        newRound: {
                            offeredPrice: 450,
                            notes: "",
                            tokenSymbol: "TST",
                            tokenDecimals: 2,
                            tokenAddress: "",
                            priceUnit: "TST",
                        },
                        decision: {
                            accept: false,
                            decline: true,
                            reason: "Offer 450 is repeatedly below minimum 550. We decline.",
                        },
                        updatedTask: {
                            // ...
                        },
                    },
                },
            },
        ],
    ] as ActionExample[][],
};
