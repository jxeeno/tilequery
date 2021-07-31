FROM node:12-alpine
RUN apk --no-cache add g++ gcc libgcc libstdc++ linux-headers make python
WORKDIR /app
COPY package.json /app
COPY yarn.lock /app
RUN yarn
COPY . /app
EXPOSE 8080
ENTRYPOINT ["node", "index.js"]