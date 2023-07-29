import { ConfigEltako } from "./config/config"
import { ShadingActor } from "./eltako/api/eltako-api"
import { log } from "./logger"
import { publish } from "./mqtt/mqtt-client"

export const registerPolling = (actors: ShadingActor[], config: ConfigEltako) => {
    const polling = config["polling-interval"] ?? 10_000
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
