FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS source
COPY . .

FROM source AS tools
RUN mkdir -p /opt/site-seed && cp -a public/assets/. /opt/site-seed/
CMD ["npm", "run", "db:migrate"]

FROM source AS builder
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.generated ./.generated
RUN mkdir -p content/blog/history public/assets .next/cache \
    && chown -R node:node content public/assets .next/cache
USER node
EXPOSE 3000
CMD ["node", "server.js"]
