import { setupServer } from "msw/node"
import { Config, ConfigEltakoDevice } from "../config/config"
import { rest } from "msw"

const credentials = {
    username: "admin",
    password: "123456789"
}

const token = "FHQ7vnqEcjadnuwnojjkB7YIMiEAmwaxeKB32TX-9DH"

export const localConfig: ConfigEltakoDevice = {
    ...credentials,
    ip: "192.168.0.200",
    name: "living room",
    blindsConfig: {
        halfOpenPercentage: 2
    }
}

const baseUrl = `https://${localConfig.ip}/api/v0`

const login = () => {
    return rest.post(`${baseUrl}/login`, async (req, res, ctx) => {
        const data = await req.json()
        const expected = {
            user: credentials.username,
            password: credentials.password
        }

        if (JSON.stringify(data) === JSON.stringify(expected)) {
            return res(
                ctx.json({
                    apiKey: token
                })
            )
        }

        return res(ctx.status(401))
    })
}

const deviceGuid = "d193aaee-e711-400c-bfac-6533a3fae5bb"

const devices = () => {
    return rest.get(`${baseUrl}/devices`, async (req, res, ctx) => {
        if (req.headers.get("Authorization") !== token) {
            return res(ctx.status(401))
        }

        return res(
            ctx.json([
                {
                    deviceGuid,
                    productGuid: "26fe450d-f704-47ee-8141-6b6f8a1f7a8e",
                    displayName: "living room",
                    infos: [
                        {
                            type: "number",
                            identifier: "currentPosition",
                            value: 2
                        },
                        {
                            type: "number",
                            identifier: "maxRuntime",
                            value: 20420
                        },
                        {
                            type: "number",
                            identifier: "power",
                            value: 0
                        }
                    ],
                    settings: [
                        {
                            type: "enumeration",
                            identifier: "runtimeMode",
                            value: "auto"
                        },
                        {
                            type: "number",
                            identifier: "runtime",
                            value: 16000
                        }
                    ],
                    functions: [
                        {
                            type: "number",
                            identifier: "targetPosition",
                            value: 2
                        }
                    ]
                },
                {
                    deviceGuid: "3741a719-a0e9-49fc-9f37-f1e8fd3e418f",
                    productGuid: "d03c45e5-f9f7-4a49-8d30-4876b0ea4ecb",
                    displayName: "3_CHANNEL_INPUT",
                    infos: [],
                    settings: [],
                    functions: [
                        {
                            type: "enumeration",
                            identifier: "inputChannel1",
                            value: "opened"
                        },
                        {
                            type: "enumeration",
                            identifier: "inputChannel2",
                            value: "opened"
                        },
                        {
                            type: "enumeration",
                            identifier: "inputBridged",
                            value: "opened"
                        }
                    ]
                }
            ])
        )
    })
}

let position = 0

const putTargetPosition = () => {
    return rest.put(`${baseUrl}/devices/${deviceGuid}/functions/targetPosition`, async (req, res, ctx) => {
        const data = await req.json()
        setTimeout(() => {
            position = data.value
        }, 50)

        return res(ctx.status(202))
    })
}

const getCurrentPosition = () => {
    return rest.get(`${baseUrl}/devices/${deviceGuid}/infos/currentPosition`, async (req, res, ctx) => {
        return res(ctx.json({
            value: position
        }))
    })
}

export const server = setupServer(
    login(), devices(), putTargetPosition(), getCurrentPosition()
)

export const testConfig = () => {
    return {
        mqtt: {
            url: "tcp://192.168.0.1:1883",
            retain: true,
            topic: "home/eltako",
            qos: 2
        },
        eltako: {
            devices: [
                localConfig
            ],
            "polling-interval": 120000
        },
        loglevel: "trace"
    } as Config
}
