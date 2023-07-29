import { localConfig, server } from "../eltako-testutils"
import { initActor } from "./eltako-api"

describe("eltako-api", () => {
    beforeAll(() => server.listen())
    afterAll(() => server.close())

    test("Login", async () => {
        const actor = await initActor(localConfig)
        expect(actor.getDisplayName()).toBe("living room")
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
})
