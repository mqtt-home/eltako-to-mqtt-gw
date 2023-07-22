import EventSource from "eventsource"
import cron from "node-cron"
import { getAppConfig } from "./config/config"
import { initActor, ShadingActor } from "./eltako/api/eltako-api"
import { log } from "./logger"
// import { login, needsRefresh } from "./miele/login/login"
// import { smallMessage } from "./miele/miele"
// import { startSSE } from "./miele/sse-client"
import { connectMqtt, publish } from "./mqtt/mqtt-client"

export const triggerFullUpdate = async () => {
    // if (needsRefresh()) {
    //     log.info("Token refresh required. Reconnecting now.")
    //     await restart()
    // }
}

const restart = async () => {
    eventSource?.close()
    await start()
}

let eventSource: EventSource

const actors: ShadingActor[] = []

const start = async () => {
    const config = getAppConfig()

    for (const device of config.eltako.devices) {
        actors.push(await initActor(device.ip, device.username, device.password))
    }

    const polling = config.eltako["polling-interval"] ?? 10_000
    for (const actor of actors) {
        setInterval(async () => {
            log.debug("Polling actor", actor.getDisplayName())
            const position = await actor.getPosition()
            const displayName = actor.getDisplayName()
            log.debug("Polling result", { position, displayName })
            publish({ position }, displayName)
        }, polling)
    }

    // const token = await (login())
    //
    // const { sse, registerDevicesListener } = startSSE(token.access_token, restart)
    //
    // registerDevicesListener((devices) => {
    //     for (const device of devices) {
    //         publish(smallMessage(device), device.id)
    //         publish(device.data, `${device.id}/full`)
    //     }
    // })
    //
    // registerConnectionCheck(restart)
    //
    // eventSource = sse
}

export const startApp = async () => {
    try {
        const mqttCleanUp = await connectMqtt()
        await start()
        await triggerFullUpdate()
        log.info("Application is now ready.")

        log.info("Scheduling token-update.")
        const task = cron.schedule("* * * * *", triggerFullUpdate)
        task.start()

        return () => {
            mqttCleanUp()
            eventSource?.close()
            task.stop()
        }
    }
    catch (e) {
        log.error("Application failed to start", e)
        process.exit(1)
    }
}
