import cron from "node-cron"
import { getAppConfig } from "./config/config"
import { initActor, ShadingActor } from "./eltako/api/eltako-api"
import { log } from "./logger"
import { connectMqtt, publish } from "./mqtt/mqtt-client"

export const triggerFullUpdate = async () => {
    log.debug("Triggering full update (token refresh)")
    for (const actor of actors) {
        await actor.updateToken()
    }
    log.debug("Full update (token refresh) done")
}

const actors: ShadingActor[] = []

export const getActors = () => actors

const start = async () => {
    const config = getAppConfig()

    for (const device of config.eltako.devices) {
        const actor = await initActor(device.ip, device.username, device.password)
        log.info("Actor initialized", { ip: device.ip, name: actor.getDisplayName() })
        actors.push(actor)
    }

    const polling = config.eltako["polling-interval"] ?? 10_000
    for (const actor of actors) {
        setInterval(async () => {
            log.debug("Polling actor", actor.getDisplayName())
            try {
                const position = await actor.getPosition()
                const displayName = actor.getDisplayName()
                log.debug("Polling result", { position, displayName })
                publish({ position }, displayName)
            }
            catch (e) {
                log.error("Failed to poll actor", actor.getDisplayName(), e)
            }
        }, polling)
    }
}

export const startApp = async () => {
    try {
        const mqttCleanUp = await connectMqtt()
        await start()
        log.info("Application is now ready.")

        const cronExpression = "0 */2 * * *"
        log.info("Scheduling token-update at", cronExpression)
        const task = cron.schedule(cronExpression, triggerFullUpdate)
        task.start()

        return () => {
            mqttCleanUp()
            task.stop()
        }
    }
    catch (e) {
        log.error("Application failed to start", e)
        process.exit(1)
    }
}
