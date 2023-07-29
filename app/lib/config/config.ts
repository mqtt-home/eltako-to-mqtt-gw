import * as fs from "fs"
import { log } from "../logger"

export type ConfigMqtt = {
    url: string,
    topic: string
    username?: string
    password?: string
    retain: boolean
    qos: (0 | 1 | 2)
    "bridge-info"?: boolean
    "bridge-info-topic"?: string
}
export type ConfigEltakoDevice = {
    ip: string
    username: string
    password: string
    name?: string
    blindsConfig?: {
        halfOpenPercentage?: number
    }
}

export type ConfigEltako = {
    devices: ConfigEltakoDevice[]
    "polling-interval"?: number
}

export type Config = {
    mqtt: ConfigMqtt
    eltako: ConfigEltako
    "send-full-update": boolean
    loglevel: string
}

let appConfig: Config

const mqttDefaults = {
    qos: 1,
    retain: true,
    "bridge-info": true
}

const configDefaults = {
    "send-full-update": true,
    loglevel: "info"
}

export const applyDefaults = (config: any) => {
    return {
        ...configDefaults,
        ...config,
        mqtt: { ...mqttDefaults, ...config.mqtt }
    } as Config
}

export const loadConfig = (file: string) => {
    const buffer = fs.readFileSync(file)
    applyConfig(JSON.parse(buffer.toString()))
    return appConfig
}

export const applyConfig = (config: any) => {
    appConfig = applyDefaults(config)
    log.configure(appConfig.loglevel.toUpperCase())
}

export const getAppConfig = () => {
    return appConfig
}
