# The factory's project and product management viewer. Build from the repository root:
#   docker compose -f pm/compose.yaml up -d --build
FROM node:22.12.0-alpine3.21@sha256:51eff88af6dff26f59316b6e356188ffa2c422bd3c3b76f2556a2e7e89d080bd
ENV NODE_ENV=production PORT=5190 HOST=0.0.0.0 PM_USE_MOUNTS=1 PM_CONFIG=/app/pm/projects.json
WORKDIR /app
COPY core/schemas/ core/schemas/
COPY pm/read.mjs pm/server.mjs pm/projects.json pm/
COPY pm/public/ pm/public/
USER node
EXPOSE 5190
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "fetch('http://127.0.0.1:5190/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "pm/server.mjs"]
