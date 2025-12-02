import { GameData, GameDefinition } from "sc-number-game-base";
import { RoundResultConsumer } from "../../../src/event-consumers";
import { stub } from "jest-auto-stub";
import { RoundResultPublisher } from "sc-number-game-base/dist/event-publishers";
import { ProvablyFairConsumer } from "sc-number-game-base/dist/event-consumers";
import * as Helpers from "../../../src/helpers/result-helper";
import Chance from "chance";
import { SeedHelper } from "sc-game-base/src/core/helpers";
import gameSettings from "../../../src/game-settings";
import { DrawResult } from "../../../src/models/rounds";
import { GameConfigs } from "sc-game-base/src/core/game-data";

const chance = new Chance();

function generateSeed(): string {
    return chance.ssn({ ssnFour: true });
}

describe("statistic test", () => {
    let consumer: RoundResultConsumer;
    const gameData = stub<GameData>();
    const definition = stub<GameDefinition>();
    const publisher = stub<RoundResultPublisher>();
    const provablyFairConsumer = stub<ProvablyFairConsumer>();
    const numberOfTurnsToRun = 20_000 * gameSettings.numberOfTurnsPerRound;

    beforeEach(() => {
        consumer = new RoundResultConsumer(gameData, definition, publisher, null, provablyFairConsumer);
        consumer.gameData.roundResult = [];
    });

    describe("statistic test", () => {
        for (let randomMode = 1; randomMode < 4; randomMode++) {
            it("should return expected", () => {
                gameData.gameConfigs = {
                    randomMode: randomMode,
                } as GameConfigs;

                const expectedProbabilities = {
                    player: 47.6,
                    banker: 47.6,
                    tie: 2.8,
                };

                const statistic = {
                    player: 0,
                    banker: 0,
                    tie: 0,
                };

                const draw1 = { ...statistic };
                const draw2 = { ...statistic };
                const draw3 = { ...statistic };
                const draw4 = { ...statistic };

                function getDraw(draw: number): any {
                    switch (draw) {
                        case 1:
                            return draw1;
                        case 2:
                            return draw2;
                        case 3:
                            return draw3;
                        case 4:
                            return draw4;
                    }
                    return {};
                }

                for (let turn = 1; turn <= numberOfTurnsToRun; turn++) {
                    const numberOfClients = chance.integer({ min: 0, max: 20 });
                    let mergeClientSeed = "";
                    for (let i = 0; i < numberOfClients; i++) {
                        mergeClientSeed += generateSeed();
                    }

                    const serverSeed = consumer.generateServerSeed();

                    const mergeSeed = serverSeed + mergeClientSeed;
                    const finalHash = SeedHelper.getSHA512Hash(mergeSeed);

                    const result = Helpers.generateResult({ finalHash, serverSeed });
                    const settlementResult = Helpers.getSettlementResult(result as DrawResult);

                    const currentDraw = getDraw(turn % gameSettings.numberOfTurnsPerRound || gameSettings.numberOfTurnsPerRound);

                    if (settlementResult.banker) {
                        currentDraw.banker++;
                        statistic.banker++;
                    } else if (settlementResult.player) {
                        currentDraw.player++;
                        statistic.player++;
                    } else if (settlementResult.tie) {
                        currentDraw.tie++;
                        statistic.tie++;
                    }

                    gameData.roundResult.push(result);

                    if (turn % gameSettings.numberOfTurnsPerRound === 0) {
                        gameData.roundResult = [];
                    }
                }

                const probabilities = {
                    player: (statistic.player / numberOfTurnsToRun) * 100,
                    banker: (statistic.banker / numberOfTurnsToRun) * 100,
                    tie: (statistic.tie / numberOfTurnsToRun) * 100,
                };

                for (let i = 1; i <= gameSettings.numberOfTurnsPerRound; i++) {
                    const draw = getDraw(i);
                    const probabilitiesDraw = {
                        player: ((draw.player * gameSettings.numberOfTurnsPerRound) / numberOfTurnsToRun) * 100,
                        banker: ((draw.banker * gameSettings.numberOfTurnsPerRound) / numberOfTurnsToRun) * 100,
                        tie: ((draw.tie * gameSettings.numberOfTurnsPerRound) / numberOfTurnsToRun) * 100,
                    };

                    expect(probabilitiesDraw.player).toBeGreaterThanOrEqual(expectedProbabilities.player);
                    expect(probabilitiesDraw.banker).toBeGreaterThanOrEqual(expectedProbabilities.banker);
                    expect(probabilitiesDraw.tie).toBeGreaterThanOrEqual(expectedProbabilities.tie);
                }

                expect(probabilities.player).toBeGreaterThanOrEqual(expectedProbabilities.player);
                expect(probabilities.banker).toBeGreaterThanOrEqual(expectedProbabilities.banker);
                expect(probabilities.tie).toBeGreaterThanOrEqual(expectedProbabilities.tie);
            });
        }
    });
});
