// plugin-otc/actions/listProtocols.ts
import {
    Action,
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
} from "@elizaos/core";
import { OtcProtocol } from "../types";
import { initializeSharedData } from "../types/sharedData";

export const sampleProtocols: OtcProtocol[] = [
    {
        protocolId: "htlc",
        protocolName: "Hash Time-Locked Contract",
        description:
            "Atomic swaps for cross-chain transactions. No central custodian.",
    },
    {
        protocolId: "escrow",
        protocolName: "Escrow Contract",
        description:
            "Use a trusted third-party or smart contract as escrow for safe OTC.",
    },
    {
        protocolId: "tee",
        protocolName: "TEE-based Swap",
        description:
            "Utilize Trusted Execution Environment for secure multi-party agreement.",
    },
    {
        protocolId: "simpleOffchain",
        protocolName: "Simple Off-chain Payment",
        description:
            "For same-chain or same-platform trades with minimal overhead.",
    },
];

export const listProtocolsAction: Action = {
    name: "LIST_OTC_PROTOCOLS",
    similes: ["SHOW_PROTOCOLS", "PROTOCOL_OPTIONS", "OTC_METHODS"],
    description: "List available OTC protocols for user reference.",
    validate: async (_runtime, _message, state: State) => {
        initializeSharedData(state);
        return true;
    },
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        state: State,
        _options,
        callback?: HandlerCallback,
    ): Promise<boolean> => {
        // Optionally we can store them in state if needed
        state.sharedData.availableOtcProtocols = sampleProtocols;

        if (callback) {
            const protocolsListStr = sampleProtocols
                .map(
                    (p) =>
                        `• [${p.protocolId}] ${p.protocolName} - ${p.description}`,
                )
                .join("\n");
            callback({
                text: `Here are available OTC protocols:\n${protocolsListStr}`,
                content: sampleProtocols,
            });
        }
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Could you show me the different OTC protocols we can use?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Certainly. Let me list the available OTC protocols for you.",
                    action: "LIST_OTC_PROTOCOLS",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: `Here are available OTC protocols:
    • [htlc] Hash Time-Locked Contract - Atomic swaps for cross-chain transactions. No central custodian.
    • [escrow] Escrow Contract - Use a trusted third-party or smart contract as escrow for safe OTC.
    • [tee] TEE-based Swap - Utilize Trusted Execution Environment for secure multi-party agreement.
    • [simpleOffchain] Simple Off-chain Payment - For same-chain or same-platform trades with minimal overhead.`,
                    content: sampleProtocols,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "I need a secure method for a cross-chain swap. Any suggestions?",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Sure. Let me fetch the list of protocols first, so we can pick the right one.",
                    action: "LIST_OTC_PROTOCOLS",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: `Here's what we have:
    • [htlc] Hash Time-Locked Contract - Great for cross-chain atomic swaps.
    • [escrow] Escrow Contract - Involves a trusted third party, also secure but requires trust.
    • [tee] TEE-based Swap - Hardware-level secure environment.
    • [simpleOffchain] Simple Off-chain Payment - Minimal overhead if on the same chain.`,
                    content: sampleProtocols,
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "What OTC methods do you support? I'd like something that doesn't rely on a central custodian.",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: "Let me show you the available OTC protocols. That will help us decide the best approach.",
                    action: "LIST_OTC_PROTOCOLS",
                },
            },
            {
                user: "{{agent}}",
                content: {
                    text: `We offer four protocols:
    • [htlc] Hash Time-Locked Contract - No central custodian needed, suitable for cross-chain atomic swaps.
    • [escrow] Escrow Contract - Uses a third-party or smart contract for safety.
    • [tee] TEE-based Swap - Trusted Execution Environment for secure collaboration.
    • [simpleOffchain] Simple Off-chain Payment - Lightweight option for same-chain transactions.`,
                    content: sampleProtocols,
                },
            },
        ],
    ] as ActionExample[][],
};
