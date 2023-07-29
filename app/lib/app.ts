import cron from "node-cron"
import { getActors, registerActors } from "./actorRegistry"
import { getAppConfig } from "./config/config"
import { log } from "./logger"
import { connectMqtt } from "./mqtt/mqtt-client"
import { registerPolling } from "./polling"

export const triggerFullUpdate = async () => {
    log.debug("Triggering full update (token refresh)")
    for (const actor of getActors()) {
        await actor.updateToken()
    }
    log.debug("Full update (token refresh) done")
}

const start = async () => {
    const config = getAppConfig()
    const actors = await registerActors(config.eltako)
    registerPolling(actors, config.eltako["polling-interval"] ?? 10_000)
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
