import Duration from "@icholy/duration"
import { Axios } from "axios"
import https from "https"
import { ConfigEltakoDevice } from "../../config/config"
import { log } from "../../logger"
import { currentPosition, Device, Info, targetPosition } from "./device"

const ignoringCertsAgent = new https.Agent({
    rejectUnauthorized: false
})

const sleep = async (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export const withRetry = async (func: () => Promise<any>) => {
    let retryCount = 0
    while (true) {
        try {
            return await func()
        }
        catch (e) {
            if (retryCount > 3) {
                throw e
            }
            retryCount++
            log.warn(`Error while executing function, retrying ${retryCount}`, e)
            await sleep(1)
        }
    }
}

type InfoProvider = (x: Device) => Info[]

export class ShadingActor {
    // constructor with ip, username, password
    private instance: Axios
    private devices: Device[] = []
    private username?: string
    private password?: string
    public blindsHalfOpenPercentage: number = 3
    public name?: string

    constructor (ip: string) {
        this.instance = new Axios({
            baseURL: `https://${ip}:443/api/v0`,
            headers: {
                "Content-Type": "application/json"
            },
            httpsAgent: ignoringCertsAgent
        })
    }

    public login = async (username: string, password: string) => {
        this.username = username
        this.password = password
        await this.updateToken()
    }

    public updateToken = async () => {
        if (!this.username || !this.password) {
            throw new Error("Username or password not set")
        }

        const response = await this.instance.post("/login", JSON.stringify({
            user: this.username,
            password: this.password
        }), {
            headers: {
                "Content-Type": "application/json"
            }
        })

        if (response.status !== 200) {
            throw new Error(`Unexpected status code ${response.status}, expected 200. Response: ${response.data}`)
        }

        const data = JSON.parse(response.data)
        this.instance.defaults.headers.common = {
            Authorization: data.apiKey
        }
    }

    public fetchDevices = async () => {
        const response = await this.instance.get("/devices")
        const data = JSON.parse(response.data)
        this.devices = data as Device[]
        return this.devices
    }

    private findDeviceByFunction = (identifier: string) => {
        return this.findDeviceBy(identifier, d => d.functions)
    }

    private findDeviceByInfo = (identifier: string) => {
        return this.findDeviceBy(identifier, d => d.infos)
    }

    private findDeviceBy = (identifier: string, provider: InfoProvider) => {
        if (this.devices.length === 0) {
            throw new Error("No devices found")
        }

        const device = this.devices.find(d => provider(d).find(info => info.identifier === identifier))
        if (!device) {
            throw new Error(`Device not found ${identifier}`)
        }
        return device
    }

    public getDisplayName = () => {
        return this.name ?? this.findDeviceByInfo(currentPosition).displayName
    }

    public setPosition = async (pos: number, device: Device = this.findDeviceByFunction(targetPosition)) => {
        return await withRetry(async () => {
            log.info(`Setting position of device ${device.displayName} to ${pos}`)
            const response = await this.instance.put(`/devices/${device.deviceGuid}/functions/${targetPosition}`, JSON.stringify(
                {
                    type: "number",
                    identifier: targetPosition,
                    value: pos
                }
            ), {
                headers: {
                    "Content-Type": "application/json"
                }
            })

            if (response.status !== 202) {
                throw new Error(`Unexpected status code ${response.status}, expected 202. Response: ${response.data}`)
            }
        })
    }

    public getPosition = async (device: Device = this.findDeviceByInfo(currentPosition)) => {
        return await withRetry(async () => {
            const response = await this.instance.get(`/devices/${device.deviceGuid}/infos/${currentPosition}`)
            const data = JSON.parse(response.data)
            return data.value
        })
    }

    waitJob = 0

    public waitForPosition = async (position: number, device: Device = this.findDeviceByInfo(currentPosition)) => {
        if (position < 0 || position > 100) {
            throw new Error(`Position ${position} is out of range`)
        }

        const myWaitJob = ++this.waitJob

        log.debug(`Wait for position of device ${device.displayName} to ${position}`)

        const startTime = new Date().getTime()
        let p = await this.getPosition(device)
        while (p !== position) {
            if (myWaitJob !== this.waitJob) {
                log.debug(`Wait for position of device ${device.displayName} to ${position} aborted`)
                return
            }
            log.trace(`Current position of device ${device.displayName} is ${p}, waiting for ${position}`)
            await sleep(1)
            p = await this.getPosition(device)

            if (Duration.since(startTime).isGreaterThan(Duration.seconds(100))) {
                log.error("Timeout waiting for position", { device: device.displayName, position })
                throw new Error(`Timeout waiting for position ${position} of device ${device.displayName}`)
            }
        }
        log.debug(`Position ${position} of device ${device.displayName} reached`)
    }

    public setAndWaitForPosition = async (pos: number) => {
        const device = this.findDeviceByInfo(currentPosition)
        await this.setPosition(pos, device)
        await this.waitForPosition(pos, device)
    }

    public open = async () => {
        await this.setAndWaitForPosition(100)
    }

    public close = async () => {
        await this.setAndWaitForPosition(0)
    }

    public closeAndOpenBlinds = async () => {
        await this.setAndWaitForPosition(0)
        await this.setAndWaitForPosition(this.blindsHalfOpenPercentage)
    }
}

export const initActor = async (config: ConfigEltakoDevice) => {
    log.info("Initializing actor", { ip: config.ip })
    const actor = new ShadingActor(config.ip)
    actor.name = config.name
    await actor.login(config.username, config.password)
    await actor.fetchDevices()
    return actor
}
