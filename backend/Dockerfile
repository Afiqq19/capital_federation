FROM node:20-alpine

WORKDIR /app

# Install git & build tools agar sqlite3 dan fitur Auto-Deploy (/updatecapital) berjalan lancar di Linux Alpine
RUN apk add --no-cache git python3 make g++ sqlite

# Install dependencies terlebih dahulu (optimasi cache layer Docker)
COPY package*.json ./
RUN npm install --production

# Salin source code backend & Web Admin statis (public/)
COPY . .

# Pastikan folder data database tersedia
RUN mkdir -p /app/data

# Expose port backend (Default Docker: 5000)
EXPOSE 5000

# Jalankan server
CMD ["node", "src/server.js"]

