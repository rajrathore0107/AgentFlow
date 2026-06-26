FROM node:18-alpine

WORKDIR /app

# Install native build tools for sqlite3 (if needed) and other dependencies
RUN apk add --no-cache python3 make g++ 

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001
CMD ["npm", "start"]
