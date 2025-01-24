// plugin-otc/types.ts
import { z } from "zod";

export const NegotiationRoundSchema = z.object({
    offeredPrice: z.number().positive(),
    notes: z.string().optional(),
});

export const NegotiationContextSchema = z.object({
    itemName: z.string().min(1).default("UndefinedItem"),
    baseCurrency: z.string().min(1).default("USDT"),
    rounds: z.array(NegotiationRoundSchema).default([]),
});

export const OtcProtocolSchema = z.object({
    protocolId: z.string().min(1),
    protocolName: z.string().min(1),
    description: z.string().optional(),
});

export type NegotiationContext = z.infer<typeof NegotiationContextSchema>;
export type OtcProtocol = z.infer<typeof OtcProtocolSchema>;

export class OtcError extends Error {
    constructor(
        message: string,
        public details?: unknown
    ) {
        super(message);
        this.name = "OtcError";
    }
}
