// negotiationStrategy.ts

import { NegotiationContext } from "./types";

export interface NegotiationDecision {
    counterOffer?: number;
    accept?: boolean;
    reason: string;
    decline?: boolean; // 若直接拒绝交易，可设为true
}

export interface DecideOptions {
    /** 若超过最大回合数，还未达成共识，可强制decline或强制counter */
    negotiationMaxRounds?: number;
    /** 若买家报价连续N次远低于最低价，可decline */
    maxLowOfferRepeats?: number;
}

/**
 * Sample structure for storing some ephemeral counters in the context
 * (e.g. repeatedLowOfferCount).
 *
 * You might store this under negotiationContext.ext or
 * state.sharedData, depending on how you track custom metadata.
 */
export interface ExtendedNegotiationContext extends NegotiationContext {
    repeatedLowOfferCount?: number; // How many times user offered below min
    repeatedHighOfferCount?: number; // If user offered above max repeatedly
}

/**
 * decideNextStep:
 *  - Uses targetPriceRange & advanced logic:
 *     1) if in range => accept
 *     2) if below min or above max => propose counter or possibly decline
 *     3) incorporate how many rounds used, how many times user is extremely off
 */
export function decideNextStep(
    currentOffer: number,
    negotiationContext: ExtendedNegotiationContext,
    targetPriceRange?: [number, number],
    decideOpts: DecideOptions = {},
): NegotiationDecision {
    const rounds = negotiationContext.rounds;
    const roundIndex = rounds.length; // e.g. 1-based number of negotiation steps
    const { repeatedLowOfferCount = 0, repeatedHighOfferCount = 0 } =
        negotiationContext;

    const { negotiationMaxRounds = 5, maxLowOfferRepeats = 2 } = decideOpts;

    // If we have a target price range
    if (targetPriceRange) {
        const [minPrice, maxPrice] = targetPriceRange;

        // If current offer is within range => accept
        if (currentOffer >= minPrice && currentOffer <= maxPrice) {
            return {
                accept: true,
                reason: `Offer ${currentOffer} is within acceptable range [${minPrice}, ${maxPrice}].`,
            };
        }

        // If below min
        if (currentOffer < minPrice) {
            // increment repeatedLowOfferCount
            const newCount = repeatedLowOfferCount + 1;

            // If user repeated too many times => decline
            if (newCount >= maxLowOfferRepeats) {
                return {
                    decline: true,
                    reason: `Offer ${currentOffer} is repeatedly below minimum ${minPrice}. We decline.`,
                };
            }

            // else propose a counter
            // e.g. approach the midpoint from the minPrice side
            const targetMid = (minPrice + maxPrice) / 2;
            const gap = minPrice - currentOffer;
            // simple formula: propose something ~ in the lower bound but closer to min
            const counter = Math.round((minPrice - gap * 0.3) * 100) / 100;
            return {
                counterOffer: counter,
                reason: `Countering as ${currentOffer} < min(${minPrice}). (repeatedLowOfferCount=${newCount})`,
            };
        }
        // If above max
        else {
            const newHighCount = repeatedHighOfferCount + 1;

            // e.g. we typically wouldn't decline if user is offering more than max.
            // But you might have an upper limit scenario. We'll not do a decline here, just a bigger discount.
            const gap = currentOffer - maxPrice;
            // propose something near the maxPrice or a bit above
            const counter = Math.round((maxPrice + gap * 0.2) * 100) / 100;
            return {
                counterOffer: counter,
                reason: `Offer ${currentOffer} is above max(${maxPrice}). Adjusting downward. repeatedHighOfferCount=${newHighCount}`,
            };
        }
    }

    // If no targetRange is defined, fallback to basic logic
    // but incorporate roundIndex or previous offers

    const roundsCount = rounds.length;
    // lastRound logic
    if (roundsCount > 1) {
        const prevOffer = rounds[roundsCount - 2].offeredPrice;
        const priceMovement = currentOffer - prevOffer;

        // if price moved > 10% in our favor => accept
        if (priceMovement < 0 && Math.abs(priceMovement) > prevOffer * 0.1) {
            return {
                accept: true,
                reason: `Price improved by more than 10% from last offer. Accepting.`,
            };
        }

        // if no improvement and near same => small counter
        const factor = priceMovement > 0 ? 0.95 : 1.05;
        let counter = currentOffer * factor;
        // round to 2 decimals
        counter = Math.round(counter * 100) / 100;

        // check if we exceeded negotiationMaxRounds
        if (roundsCount >= negotiationMaxRounds) {
            // forced final decision
            return {
                accept: false,
                decline: true,
                reason: `Max rounds reached. We must decline or finalize differently.`,
            };
        }

        return {
            counterOffer: counter,
            reason: `Continuing negotiation. We adjust price by factor ${factor}.`,
        };
    }

    // If first round (roundsCount == 1 or 0), do a small bump if needed
    const initialCounter = Math.round(currentOffer * 1.05 * 100) / 100;
    return {
        counterOffer: initialCounter,
        reason: `First negotiation round, propose a slight increase from ${currentOffer}.`,
    };
}
