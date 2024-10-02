import { ShadingActor } from "./eltako/api/eltako-api"
import { log } from "./logger"
import { publish } from "./mqtt/mqtt-client"

let pollingErrorCount = 0
let successCount = 0

export const registerPolling = (actors: ShadingActor[], pollingIntervalMs: number) => {
    const intervals: any[] = []
    for (const actor of actors) {
        const task = async () => {
            log.debug("Polling actor", actor.getDisplayName())
            try {
                const position = await actor.getPosition()
                const displayName = actor.getDisplayName()
                log.debug("Polling result", { position, displayName })
                publish({ position }, displayName)
                successCount++

                if (pollingErrorCount > 0 && successCount > (5 * actors.length)) {
                    log.info("Good success rate, resetting polling error count")
                    pollingErrorCount = 0
                }
            }
            catch (e) {
                pollingErrorCount++
                successCount = 0
                log.error("Failed to poll actor", actor.getDisplayName(), "Error Count: " + pollingErrorCount, e)

                if (pollingErrorCount > (5 * actors.length)) {
                    log.error("Too many polling errors, restarting service")
                    process.exit(1)
                }
            }
        }

        task().then(() => log.info("Initial polling done", actor.getDisplayName))
        intervals.push(setInterval(task, pollingIntervalMs))
    }
    return () => {
        for (const interval of intervals) {
            clearInterval(interval)
        }
    }
}
