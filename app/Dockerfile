# syntax=docker/dockerfile:1.4
FROM gcr.io/distroless/static-debian12

COPY eltako-to-mqtt-gw /eltako-to-mqtt-gw

ENTRYPOINT ["/eltako-to-mqtt-gw", "/var/lib/eltako-to-mqtt-gw/config.json"]
