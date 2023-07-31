# eltako-to-mqtt-gw

[![mqtt-smarthome](https://img.shields.io/badge/mqtt-smarthome-blue.svg)](https://github.com/mqtt-smarthome/mqtt-smarthome)

Convert the Eltako Series 62-IP data to MQTT messages

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

### Open the blinds

Topic: `home/eltako/<device-name>/set`

```json
{
  "action": "open"
}
```

### Close the blinds

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

## Configuration

Example configuration:

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
