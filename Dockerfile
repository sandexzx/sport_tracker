# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci

COPY client/ client/
COPY server/ server/
RUN cd client && npx vite build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/

RUN apk add --no-cache python3 make g++ && \
    npm ci --workspace=server --production && \
    apk del python3 make g++

COPY server/ server/
COPY --from=builder /app/client/dist client/dist

RUN mkdir -p data uploads

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server/index.js"]
