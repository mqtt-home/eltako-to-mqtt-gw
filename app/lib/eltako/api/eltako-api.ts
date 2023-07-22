import Duration from "@icholy/duration"
import { Axios } from "axios"
import https from "https"
import { log } from "../../logger"
import { currentPosition, Device, Info, targetPosition } from "./device"

const ignoringCertsAgent = new https.Agent({
    rejectUnauthorized: false
})

const sleep = async (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

type InfoProvider = (x: Device) => Info[]

export class ShadingActor {
    // constructor with ip, username, password
    private instance: Axios
    private devices: Device[] = []

    constructor(ip: string) {
        // this.ip = ip;
        // this.username = username;
        // this.password = password;
        this.instance = new Axios({
            baseURL: `https://${ip}:443/api/v0`,
            headers: {
                "Content-Type": "application/json",
            },
            httpsAgent: ignoringCertsAgent
        })

        // let data = JSON.stringify({
        //     "user": username,
        //     "password": password
        // });
        //
        // let config = {
        //     url: `https://${ip}:443/api/v0/login`,
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        //     data: data,
        //     httpsAgent: new https.Agent({
        //         rejectUnauthorized: false
        //     })
        // }
    }

    public login = async (username: string, password: string) => {
        let response = await this.instance.post("/login", JSON.stringify({
            "user": username,
            "password": password
        }), {
            headers: {
                "Content-Type": "application/json",
            }
        })

        const data = JSON.parse(response.data)
        this.instance.defaults.headers.common = {
            "Authorization": data.apiKey
        }
    }

    public fetchDevices = async () => {
        let response = await this.instance.get("/devices")
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
        if (this.devices.length == 0) {
            throw new Error("No devices found")
        }

        const device = this.devices.find(d => provider(d).find(info => info.identifier === identifier))
        if (!device) {
            throw new Error(`Device not found ${identifier}`)
        }
        return device
    }

    public getDisplayName = () => {
        return this.findDeviceByInfo(currentPosition).displayName
    }

    public setPosition = async (pos: number, device: Device = this.findDeviceByFunction(targetPosition)) => {
        log.info(`Setting position of device ${device.displayName} to ${pos}`)
        let response = await this.instance.put( `/devices/${device.deviceGuid}/functions/${targetPosition}`, JSON.stringify(
            {
                "type": "number",
                "identifier": targetPosition,
                "value": pos
            }
        ), {
            headers: {
                "Content-Type": "application/json",
            }
        })

        if (response.status != 202) {
            throw new Error(`Unexpected status code ${response.status}, expected 202. Response: ${response.data}`)
        }
    }

    public getPosition = async (device: Device = this.findDeviceByInfo(currentPosition)) => {
        let response = await this.instance.get(`/devices/${device.deviceGuid}/infos/${currentPosition}`)
        const data = JSON.parse(response.data)
        return data.value
    }

    public waitForPosition = async (position: number, device: Device = this.findDeviceByInfo(currentPosition)) => {
        if (position < 0 || position > 100) {
            throw new Error(`Position ${position} is out of range`)
        }

        log.debug(`Wait for position of device ${device.displayName} to ${position}`)

        const startTime = new Date().getTime()
        let p = await this.getPosition(device)
        while (p != position) {
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
        await this.setAndWaitForPosition(3)
    }
}

export const initActor = async (ip: string, username: string, password: string) => {
    log.info("Initializing actor", { ip })
    const actor = new ShadingActor(ip)
    await actor.login(username, password)
    await actor.fetchDevices()
    return actor
}
