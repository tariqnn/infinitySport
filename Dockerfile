# Infinity Sports web app (web/admin/portal all use Neon DB directly)
FROM node:20.19-alpine

WORKDIR /app

# Copy whole monorepo (workspace install needs all package manifests)
COPY . .

RUN npm install
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN npm run build:web

EXPOSE 3000

CMD ["npm", "run", "start:web"]
