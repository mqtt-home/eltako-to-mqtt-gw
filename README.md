# eltako-to-mqtt-gw

[![mqtt-smarthome](https://img.shields.io/badge/mqtt-smarthome-blue.svg)](https://github.com/mqtt-smarthome/mqtt-smarthome)

Convert the Eltako Series 62-IP data to MQTT messages.

Some warning about these devices:
- They are announced to come with Matter support, but they will never get an update to support it.
- They do not support setting the position in a finer granularity than 1%, so tilt is only possible when the blinds are small enough that 1% is a small enough step.

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

This action will first close the blinds completely, then tilt them to the half open position. This is useful for resetting the tilt or ensuring the blinds are fully closed before tilting.

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

You can configure devices either by specifying their IP address directly or by using their serial number. If you use the serial number, the IP address will be discovered automatically using Zeroconf (mDNS/Bonjour).

### Example configuration with direct IP (without Zeroconf)

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

### Example configuration with Zeroconf (using serial number)

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

#### Zeroconf (mDNS/Bonjour) Discovery

If you specify only the `serial` property for a device (and omit the `ip`), the gateway will automatically discover the device's IP address on the local network using Zeroconf (also known as mDNS or Bonjour). This is useful if your devices get dynamic IP addresses from DHCP or if you do not want to manage static IPs.

## Developer Documentation

### Build

To build the project, run:

```sh
cd app
make build
```

This will build the binary in the `app` directory.

### Run

To run the gateway locally:

```sh
cd app
make run
```

### Docker

To build and run the Docker image:

```sh
cd app
make docker-build
make docker-run
```

Or use the provided `docker-compose.yaml` in the `production` directory:

```sh
cd production
cp config/config-example.json config/config.json
# Edit config/config.json as needed
docker-compose up --build
```

### Create a Release

Releases are created by tagging a commit in git. We use [goreleaser](https://goreleaser.com/) to build and publish release artifacts automatically.

1. Make sure all changes are committed and pushed to the main branch.
2. Create a new git tag for the release:
   ```sh
   git tag vX.Y.Z
   git push --tags
   ```
3. GitHub Actions (or your CI) will run goreleaser to build and publish the release artifacts automatically.
4. Optionally, create a release on GitHub and add release notes.
