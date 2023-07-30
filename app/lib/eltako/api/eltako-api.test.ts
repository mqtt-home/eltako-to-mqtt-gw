import { registerActors } from "../../actorRegistry"
import { log } from "../../logger"
import { localConfig, server } from "../eltako-testutils"
import { initActor, ShadingActor, withRetry } from "./eltako-api"

describe("eltako-api", () => {
    beforeAll(() => {
        log.off()
        server.listen()
    })
    afterAll(() => {
        log.on()
        server.close()
    })

    test("Login", async () => {
        const actor = await initActor(localConfig)
        expect(actor.getDisplayName()).toBe("living-room")
    })

    test("Missing username", async () => {
        const actor = new ShadingActor("192.168.0.1")
        await expect(async () => await actor.login(null as any, "password"))
            .rejects.toThrow()
    })

    test("Missing password", async () => {
        const actor = new ShadingActor("192.168.0.1")
        await expect(async () => await actor.login("username", null as any))
            .rejects.toThrow()
    })

    test("Invalid password", async () => {
        await expect(async () =>
            await initActor({ ...localConfig, password: "invalid" })
        )
            .rejects.toThrow()
    })

    test("Set position", async () => {
        const actor = await initActor(localConfig)
        await actor.setPosition(42)
        await actor.waitForPosition(42)
        expect(await actor.getPosition()).toBe(42)

        await actor.setPosition(90)
        await actor.waitForPosition(90)
        expect(await actor.getPosition()).toBe(90)
    })

    test("Close and open blinds", async () => {
        const actor = await initActor(localConfig)
        await actor.closeAndOpenBlinds()
        expect(await actor.getPosition()).toBe(3)
    })

    test("Open", async () => {
        const actor = await initActor(localConfig)
        await actor.open()
        expect(await actor.getPosition()).toBe(100)
    })

    test("Close", async () => {
        const actor = await initActor(localConfig)
        await actor.close()
        expect(await actor.getPosition()).toBe(0)
    })

    test("Wait for position out of range", async () => {
        const actor = await initActor(localConfig)
        await expect(async () => await actor.waitForPosition(101))
            .rejects.toThrow()

        await expect(async () => await actor.waitForPosition(-1))
            .rejects.toThrow()
    })

    test("Register Actors", async () => {
        const registry = await registerActors({
            devices: [localConfig]
        })
        expect(registry.length).toBe(1)
    })

    test("Retry success", async () => {
        let ctr = 0
        const func = async () => {
            ctr++
            if (ctr < 3) {
                throw new Error("Test error")
            }
            return 42
        }
        const newVar = await withRetry(func)
        expect(newVar).toBe(42)
    })

    test("Retry fail", async () => {
        const func = async () => {
            throw new Error("Test error")
        }
        await expect(async () => await withRetry(func))
            .rejects.toThrow()
    })
})
