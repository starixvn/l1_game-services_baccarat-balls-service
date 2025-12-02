import { EventConsumers } from "sc-number-game-base";
import { BET_CHOICES } from "../constants";

export default class SettleGameRoundConsumer extends EventConsumers.SettleGameRoundConsumer {
    calculateBetResult(settlementResult: any, bet: any, odds: Record<string, number>) {
        const betResult = Object.entries(settlementResult).reduce(
            (result, [choice, win]) => {
                if (choice === BET_CHOICES.tie && win) {
                    const bankerBet = bet[BET_CHOICES.banker] ?? 0;
                    const playerBet = bet[BET_CHOICES.player] ?? 0;
                    const refund = bankerBet + playerBet;

                    result.totalWin += refund;
                }

                const betAmount = bet[choice] ?? 0;
                const originalOdds = odds[choice] || 1;
                const effectiveOdds = bet.freeBet ? originalOdds - 1 : originalOdds;
                const winAmount = win ? betAmount * effectiveOdds : 0;

                result.totalBetAmount += betAmount;
                result.totalWin += winAmount;
                result.winningByChoices[choice] = winAmount;

                if (winAmount > 0) {
                    result.netWin += winAmount - betAmount;
                } else {
                    result.totalLost += betAmount;
                }

                return result;
            },
            {
                totalBetAmount: 0,
                totalWin: 0,
                netWin: 0,
                totalLost: 0,
                winningByChoices: {} as any,
            }
        );

        betResult.totalWin = parseFloat(betResult.totalWin.toFixed(4));
        betResult.netWin = parseFloat(betResult.netWin.toFixed(4));

        return betResult;
    }
}
