FROM ubuntu:16.04

RUN apt-get update && apt-get install -y \
    npm \
    nodejs-legacy
    
COPY . .

RUN npm install

CMD ./index.js
