# Jade worker. Runs on Fly.io, not Vercel: transit scans take minutes and
# serverless functions have duration caps.
FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS build
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages ./packages
COPY apps/worker ./apps/worker
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @jade/worker build

FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/worker ./apps/worker
# Ephemeris data files are baked in here once the swisseph provider lands:
# COPY .ephe /app/.ephe
EXPOSE 8080
CMD ["node", "apps/worker/dist/index.js"]
