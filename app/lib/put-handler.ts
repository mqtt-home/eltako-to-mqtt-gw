import { getActors } from "./actorRegistry"
import { log } from "./logger"

type Position = {
    position: number
}

type Action = {
    action: ("open" | "close" | "closeAndOpenBlinds")
}

const isPosition = (obj: any): obj is Position => {
    return obj.position !== undefined
}

const isAction = (obj: any): obj is Action => {
    return obj.action === "open" || obj.action === "close" || obj.action === "closeAndOpenBlinds"
}

export const putMessage = async (topic: string, message: Buffer) => {
    log.info("MQTT message received", { topic, message: message.toString() })
    try {
        const msg = JSON.parse(message.toString())
        const deviceName = topic.split("/")[0]
        const actor = getActors().find(d => d.getDisplayName() === deviceName)
        if (!actor) {
            log.error("Cannot find actor", deviceName)
            return
        }

        if (isPosition(msg)) {
            await actor.setPosition(msg.position)
        }
        else if (isAction(msg)) {
            switch (msg.action) {
            case "open":
                await actor.open()
                break
            case "close":
                await actor.close()
                break
            case "closeAndOpenBlinds":
                await actor.closeAndOpenBlinds()
                break
            }
        }
        else {
            log.error("Unknown message type", msg)
        }
    }
    catch (e) {
        log.error("Error while processing MQTT message", e)
    }
}
