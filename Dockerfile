# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to run the static build; -g and --omit=dev for minimal image
RUN npm install -g serve

COPY --from=builder /app/dist ./dist

# Cloud Run sets PORT (default 8080); serve -s enables SPA fallback to index.html
ENV PORT=8080
EXPOSE 8080

CMD ["sh", "-c", "exec serve -s dist -l ${PORT}"]
