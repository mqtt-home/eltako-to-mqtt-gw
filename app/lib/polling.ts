import { ShadingActor } from "./eltako/api/eltako-api"
import { log } from "./logger"
import { publish } from "./mqtt/mqtt-client"

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
            }
            catch (e) {
                log.error("Failed to poll actor", actor.getDisplayName(), e)
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
