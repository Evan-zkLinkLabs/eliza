// plugin-otc/actions/listProtocols.ts
import {
    Action,
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
        callback?: HandlerCallback
    ): Promise<boolean> => {
        // Optionally we can store them in state if needed
        state.sharedData.availableOtcProtocols = sampleProtocols;

        if (callback) {
            const protocolsListStr = sampleProtocols
                .map(
                    (p) =>
                        `• [${p.protocolId}] ${p.protocolName} - ${p.description}`
                )
                .join("\n");
            callback({
                text: `Here are available OTC protocols:\n${protocolsListStr}`,
                content: sampleProtocols,
            });
        }
        return true;
    },
    examples: [],
};
