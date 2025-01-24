import { NegotiationContext } from "./types";

export interface NegotiationDecision {
    counterOffer?: number;
    accept?: boolean;
    reason: string;
}

export function decideNextStep(
    currentOffer: number,
    negotiationContext: NegotiationContext,
    targetPriceRange?: [number, number]
): NegotiationDecision {
    const rounds = negotiationContext.rounds;
    const lastRound = rounds[rounds.length - 1];
    
    // If we have a target price range, use it for decision making
    if (targetPriceRange) {
        const [minPrice, maxPrice] = targetPriceRange;
        
        // If the offer is within our target range, accept it
        if (currentOffer >= minPrice && currentOffer <= maxPrice) {
            return {
                accept: true,
                reason: `Offer of ${currentOffer} ${negotiationContext.baseCurrency} is within acceptable range`,
            };
        }

        // Calculate how far we are from the target range
        const targetMidpoint = (minPrice + maxPrice) / 2;
        const offerDistance = Math.abs(currentOffer - targetMidpoint);
        
        // If we're too far from target, counter with a price closer to our range
        if (currentOffer < minPrice) {
            const counterOffer = Math.min(
                minPrice + (maxPrice - minPrice) * 0.2,
                currentOffer * 1.15
            );
            return {
                counterOffer: Math.round(counterOffer * 100) / 100,
                reason: `Counter-offering higher as ${currentOffer} ${negotiationContext.baseCurrency} is below our minimum`,
            };
        } else {
            const counterOffer = Math.max(
                maxPrice - (maxPrice - minPrice) * 0.2,
                currentOffer * 0.85
            );
            return {
                counterOffer: Math.round(counterOffer * 100) / 100,
                reason: `Counter-offering lower as ${currentOffer} ${negotiationContext.baseCurrency} is above our maximum`,
            };
        }
    }
    
    // If no target range, use basic negotiation based on history
    if (rounds.length > 1) {
        const previousOffer = rounds[rounds.length - 2].offeredPrice;
        const priceMovement = currentOffer - previousOffer;
        
        // If price is moving in our favor significantly
        if (Math.abs(priceMovement) > previousOffer * 0.05) {
            return {
                accept: true,
                reason: `Accepting significant price movement in our favor`,
            };
        }
        
        // Counter with a moderate adjustment
        const counterOffer = currentOffer * (priceMovement > 0 ? 0.95 : 1.05);
        return {
            counterOffer: Math.round(counterOffer * 100) / 100,
            reason: `Continuing negotiation with moderate adjustment`,
        };
    }
    
    // First round, make a conservative counter
    return {
        counterOffer: Math.round(currentOffer * 1.1 * 100) / 100,
        reason: `Initial counter-offer`,
    };
}
