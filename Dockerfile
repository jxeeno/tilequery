FROM node:12-alpine
WORKDIR /app
COPY package.json /app
COPY yarn.lock /app
RUN yarn
COPY . /app
EXPOSE 8080
ENTRYPOINT ["node", "index.js"]