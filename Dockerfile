FROM node:6

RUN apt-get update
RUN mkdir -p /proxy
RUN npm install -g forever
WORKDIR /proxy
COPY . /proxy
RUN npm i
EXPOSE 4444
# Sync clock
RUN echo "Europe/Madrid" > /etc/timezone
RUN dpkg-reconfigure -f noninteractive tzdata

