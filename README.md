# eltako-to-mqtt-gw

[![mqtt-smarthome](https://img.shields.io/badge/mqtt-smarthome-blue.svg)](https://github.com/mqtt-smarthome/mqtt-smarthome)

Convert the Eltako Series 62-IP data to MQTT messages and provide a modern web interface for direct control.

## Features

- **MQTT Integration**: Publish/subscribe to MQTT topics for home automation
- **Web Interface**: Modern React-based control panel for direct device management
- **REST API**: HTTP endpoints for integration with other systems
- **Zeroconf Discovery**: Automatic device discovery using mDNS/Bonjour
- **Tilt Control**: Advanced blind tilting with configurable positions

Some warning about these devices:
- They are announced to come with Matter support, but they will never get an update to support it.
- They do not support setting the position in a finer granularity than 1%, so tilt is only possible when the blinds are small enough that 1% is a small enough step.

## Web Interface

The application now includes a built-in web interface accessible at `http://localhost:8080` when running.

### Features:
- **Dashboard**: View all actors and their current status
- **Individual Control**: Set position and tilt for each actor
- **Global Controls**: Tilt all actors simultaneously
- **Real-time Updates**: Status refreshes automatically
- **Responsive Design**: Works on desktop, tablet, and mobile

![Web Interface Screenshot](web-interface-screenshot.png)

### API Endpoints:
- `GET /api/actors` - List all actors
- `GET /api/actors/{name}` - Get specific actor status
- `POST /api/actors/{name}/position` - Set actor position
- `POST /api/actors/{name}/tilt` - Tilt specific actor
- `POST /api/actors/all/tilt` - Tilt all actors

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

To build the project with web interface:

```sh
cd app
make build
```

This will build both the React frontend and Go backend.

### Run

To run the gateway with web interface:

```sh
cd app
make run
```

The web interface will be available at http://localhost:8080

### Development

For development with hot-reload:

```sh
cd app
./dev.sh
```

This starts:
- Backend API server on http://localhost:8080
- Frontend dev server on http://localhost:5173 (with hot reload)

### Docker

To build and run the Docker image with web interface:

```sh
cd app
make docker
docker run -p 8080:8080 -v /path/to/config:/var/lib/eltako-to-mqtt-gw pharndt/eltako:latest
```

Or use the development docker-compose:

```sh
cd app
docker-compose -f docker-compose.dev.yml up --build
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
