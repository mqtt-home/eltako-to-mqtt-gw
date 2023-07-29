import { initActor } from "./eltako/api/eltako-api"
import { localConfig, server } from "./eltako/eltako-testutils"
import { registerPolling } from "./polling"

const publish = jest.fn()
jest.mock("./mqtt/mqtt-client", () => ({
    publish: (data: any) => {
        publish(data)
    }
}))

describe("polling", () => {
    beforeAll(() => server.listen())
    afterAll(() => server.close())

    test("register polling without devices", () => {
        const cleanup = registerPolling([], 100)
        cleanup()
    })

    test("register polling with devices", async () => {
        const actor = await initActor(localConfig)
        await actor.fetchDevices()
        const cleanup = registerPolling([actor], 100)

        await new Promise(resolve => setTimeout(resolve, 280))
        expect(publish).toBeCalledTimes(2)

        cleanup()
    })
})
