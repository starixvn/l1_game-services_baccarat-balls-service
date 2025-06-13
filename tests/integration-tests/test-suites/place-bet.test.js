import { GameClientDriver, normalUser, eventTypes } from "sc-game-service-integration-utils";
import gameSettings from "../_stubs/game-settings";
import { getTimeOutToPlacingBetTime, initUserSession } from "../helper/helper";
import { socketOptionsFunc } from "../_stubs/test-data";
import appConfigs from "../../../build/app-configs.IGT";

const socketOptions = socketOptionsFunc(appConfigs.hostingPort);

describe("when place bet", () => {
    let client;

    beforeEach(async () => {
        client = new GameClientDriver(socketOptions, initUserSession(normalUser));

        const sendSignInInterval = setInterval(() => {
            client.sendSignInEvent();
        }, 500);

        await client.handleSignedInEvent();

        client.sendInGameEvent();

        clearInterval(sendSignInInterval);
    });

    afterEach(() => {
        client.close();
        client = null;
    });

    it("should round bet choices", async () => {
        // Arrange
        const inGameData = await client.handleGameEvent((data) => data.remainingTime);
        console.log("Initial game data:", {
            remainingTime: inGameData.remainingTime,
            timeoutDuration: getTimeOutToPlacingBetTime(inGameData.remainingTime, gameSettings.durations),
        });

        setTimeout(() => {
            const betData = { betChoices: { player: 10.9, tie: 20.9 }, clientSeed: "1234" };
            console.log("Placing bet with data:", betData);
            client.emit(eventTypes.bet, betData);
        }, getTimeOutToPlacingBetTime(inGameData.remainingTime, gameSettings.durations) * 1000);

        // Act
        const result = await client.handleGameEvent((data) => data.ownBets);
        console.log("Bet result:", {
            originalBets: { player: 10.9, tie: 20.9 },
            roundedBets: result.ownBets,
        });

        // Assert
        expect(result.ownBets).toEqual({
            player: 10,
            tie: 20,
        });
    });
});
