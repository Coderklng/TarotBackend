FROM node:20-alpine

WORKDIR /app

# Dependencies install (Layer caching optimization)
COPY package*.json ./
RUN npm install

# Application code copy
COPY . .

EXPOSE 8080

CMD ["npx", "nodemon", "server.js"]