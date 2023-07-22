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

let configFile: string

export const loadConfig = (file: string) => {
    configFile = file
    const buffer = fs.readFileSync(file)
    applyConfig(JSON.parse(buffer.toString()))
    return appConfig
}

const equals = (obj1: any, obj2: any) => {
    return JSON.stringify(obj1) === JSON.stringify(obj2)
}

export const applyConfig = (config: any) => {
    appConfig = applyDefaults(config)
    log.configure(appConfig.loglevel.toUpperCase())
}

export const getAppConfig = () => {
    return appConfig
}
