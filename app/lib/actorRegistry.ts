import { ConfigEltako } from "./config/config"
import { initActor, ShadingActor } from "./eltako/api/eltako-api"
import { log } from "./logger"

const actors: ShadingActor[] = []

export const getActors = () => actors

export const registerActors = async (config: ConfigEltako) => {
    for (const device of config.devices) {
        const actor = await initActor(device)
        if (device?.blindsConfig?.halfOpenPercentage) {
            actor.blindsHalfOpenPercentage = device.blindsConfig.halfOpenPercentage
        }
        log.info("Actor initialized", { ip: device.ip, name: actor.getDisplayName() })
        actors.push(actor)
    }

    return actors
}
