import { State } from "@elizaos/core";
import { InMemoryOtcTaskManager } from "../InMemoryOtcTaskManager";
import { OtcProtocol } from "../types";

export interface OtcSharedData {
    currentTaskId?: string;
    taskManager?: InMemoryOtcTaskManager;
    availableOtcProtocols?: OtcProtocol[];
}

declare module "@elizaos/core" {
    interface State {
        sharedData?: Partial<OtcSharedData> & Record<string, unknown>;
    }
}

// Initialize default state
export function initializeSharedData(state: State) {
    if (!state.sharedData) {
        state.sharedData = {};
    }
    return state;
}
