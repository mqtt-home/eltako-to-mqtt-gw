# syntax=docker/dockerfile:1.17
ARG BINARY
FROM gcr.io/distroless/static:nonroot

COPY ${BINARY}/eltako-to-mqtt-gw /eltako-to-mqtt-gw

ENTRYPOINT ["/eltako-to-mqtt-gw", "/var/lib/eltako-to-mqtt-gw/config.json"]