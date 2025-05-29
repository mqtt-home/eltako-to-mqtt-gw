# eltako-to-mqtt-gw

[![mqtt-smarthome](https://img.shields.io/badge/mqtt-smarthome-blue.svg)](https://github.com/mqtt-smarthome/mqtt-smarthome)

Convert the Eltako Series 62-IP data to MQTT messages.

Some waring about those devices:
- they are announced to come with Matter support, but they will never get an update support it
- they do not support setting the position in a finer granularity than 1% so tilt is only possible when the blinds
  are small enough so that 1% is a small enough step

## Devices

Currently, the `ESB62NP-IP/110-240V` is supported.

## Messages

### Position

Topic: `home/eltako/<device-name>`

```json
{
  "position": 0
}
```

### Set position

Topic: `home/eltako/<device-name>/set`

```json
{
  "position": 100
}
```

### Open the shading

Topic: `home/eltako/<device-name>/set`

```json
{
  "action": "open"
}
```

### Close the shading

Topic: `home/eltako/<device-name>/set`

```json
{
  "action": "close"
}
```

### Close and open the blinds

Topic: `home/eltako/<device-name>/set`

```json
{
  "action": "closeAndOpenBlinds"
}
```

### Tilt the blinds

Topic: `home/eltako/<device-name>/set`

```json
{
  "action": "tilt",
  "position": 50
}
```

This will move the position to 50% and then tilt the blinds.

## Configuration

Example configuration:

- use IP or serial number
- when using the serial number, the IP is determined using Zeroconf 

```json
{
  "mqtt": {
    "url": "tcp://192.168.0.1:1883",
    "retain": true,
    "topic": "home/eltako",
    "qos": 2
  },
  "eltako": {
    "devices": [
      {
        "ip": "192.168.1.15",
        "serial": "abcdef",
        "username": "admin",
        "password": "123456789",
        "name": "living-room",
        "blindsConfig": {
          "halfOpenPercentage": 2
        }
      }
    ],
    "polling-interval": 120000
  },
  "loglevel": "trace"
}
```
