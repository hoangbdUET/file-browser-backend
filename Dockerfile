FROM node:8.12.0-alpine

MAINTAINER I2G

# Set workdir
WORKDIR /app

# Copy app source
COPY . /app
COPY ./config/kubernetes.json /app/config

# Install npm package
COPY package.json /app
RUN npm install

# Set Environment
ENV NODE_ENV=kubernetes

EXPOSE 3001

CMD ["node", "./src/index.js"]