FROM node:6

RUN apt-get update
RUN mkdir -p /proxy
RUN npm install -g forever
WORKDIR /proxy
COPY . /proxy
RUN npm i
EXPOSE 4444
