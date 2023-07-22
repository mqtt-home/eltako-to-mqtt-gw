export const targetPosition = "targetPosition"
export const currentPosition = "currentPosition"

export type Info = {
    type: string
    identifier: string
    value: any
}

export type Device = {
    deviceGuid: string
    productGuid: string
    displayName: string
    infos: Info[]
    settings: Info[]
    functions: Info[]
}
