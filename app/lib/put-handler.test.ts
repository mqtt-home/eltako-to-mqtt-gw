import { getActors, registerActors } from "./actorRegistry"
import { localConfig, server } from "./eltako/eltako-testutils"
import { log } from "./logger"
import { putMessage } from "./put-handler"

describe("put-handler", () => {
    beforeAll(() => {
        log.off()
        server.listen()
    })
    afterAll(() => {
        log.on()
        server.close()
    })

    test("put position", async () => {
        await registerActors({
            devices: [localConfig]
        })

        for (const position of [0, 50, 100]) {
            await putMessage("living-room", Buffer.from(JSON.stringify({
                position
            })))

            const actor = getActors()[0]
            await actor.waitForPosition(position)
            expect(await getActors()[0].getPosition()).toBe(position)
        }
    })

    test("invalid actor", async () => {
        await putMessage("invalid", Buffer.from(JSON.stringify({
            position: 100
        })))
    })

    test("invalid data", async () => {
        await registerActors({
            devices: [localConfig]
        })

        await putMessage("living-room", Buffer.from("invalid"))
    })

    test("invalid JSON data", async () => {
        await registerActors({
            devices: [localConfig]
        })

        await putMessage("living-room", Buffer.from("{}"))
    })

    test("put action - open/close", async () => {
        await registerActors({
            devices: [localConfig]
        })

        for (const action of ["open", "close"]) {
            await putMessage("living-room", Buffer.from(JSON.stringify({
                action
            })))

            const actor = getActors()[0]
            await actor.waitForPosition(action === "open" ? 100 : 0)
            expect(await getActors()[0].getPosition()).toBe(action === "open" ? 100 : 0)
        }
    })

    test("put action - closeAndOpenBlinds", async () => {
        await registerActors({
            devices: [localConfig]
        })

        await putMessage("living-room", Buffer.from(JSON.stringify({
            action: "closeAndOpenBlinds"
        })))

        const actor = getActors()[0]
        await actor.waitForPosition(2)
        expect(await getActors()[0].getPosition()).toBe(2)
    })
})
