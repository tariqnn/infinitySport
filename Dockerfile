# Infinity Sports API - run from project root
FROM node:20-alpine

WORKDIR /app

# Copy whole project (monorepo needs all workspaces for npm install)
COPY . .

# Install dependencies (from root - includes workspaces)
RUN npm install

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build the API
RUN npm run build:api

EXPOSE 4000

# Run migrations then start the API (docker-entrypoint.sh was copied with COPY . .)
RUN chmod +x docker-entrypoint.sh
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "apps/api/dist/main"]
