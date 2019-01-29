FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
    npm
WORKDIR /hf-status
COPY .  /hf-status

RUN npm install

EXPOSE 9100
CMD /hf-status/index.js
