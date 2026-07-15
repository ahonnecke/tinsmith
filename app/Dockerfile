# --- Base ---
FROM node:20-alpine AS base
WORKDIR /app

# --- Dependencies ---
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# --- Dev ---
FROM base AS dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["npm", "run", "dev"]

# --- Start (build then serve with next start, avoids Turbopack fd issues) ---
FROM base AS start
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["npm", "start"]

# --- Builder ---
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Prod ---
FROM base AS prod
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# db/ ships in the image so the Fly release_command can run migrations
COPY --from=builder /app/db ./db
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
