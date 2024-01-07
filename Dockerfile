FROM node:20.10-alpine
COPY app/dist /opt/app/
WORKDIR /opt/app/

CMD ["node", "index.js", "/var/lib/eltako-to-mqtt-gw/config.json"]
