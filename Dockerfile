FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
    npm
    
COPY . .

RUN npm install

CMD ./index.js
