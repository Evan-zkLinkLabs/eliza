// plugin-otc/index.ts
import { Plugin } from "@elizaos/core";
import { createOtcTaskAction } from "./actions/createOtcTaskAction";
import { ownerListTasksAction } from "./actions/ownerListTasksAction";
import { negotiatePriceAction } from "./actions/negotiatePriceAction";
import { finalizeOtcDealAction } from "./actions/finalizeOtcDealAction";
import { listProtocolsAction } from "./actions/listProtocolsAction";

/**
 * Plugin for the Owner side to manage tasks (create, list, update).
 */
export const ownerTaskPlugin: Plugin = {
    name: "owner-otc-tasks",
    description: "Plugin for the Owner to manage OTC tasks",
    actions: [
        createOtcTaskAction,
        ownerListTasksAction,
        // ...any other 'owner only' actions (updateTask, finalizeTask, etc)
    ],
    evaluators: [],
    providers: [],
};

/**
 * Plugin for the external-facing OTC negotiator agent:
 * can do price negotiation, list protocols, finalize deals, but not manage tasks at an owner level.
 */
export const otcNegotiatorPlugin: Plugin = {
    name: "otc-negotiator",
    description:
        "Plugin for OTC price negotiation and finalizing deals with external parties.",
    actions: [negotiatePriceAction, finalizeOtcDealAction, listProtocolsAction],
    evaluators: [],
    providers: [],
};
