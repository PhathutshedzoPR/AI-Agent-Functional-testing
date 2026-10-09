# TestPilot in one container: Playwright's image brings Node, Chromium and its system libraries,
# matched to the playwright package in package-lock.json (1.63.0).
FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Dependencies first, so a code change does not reinstall them.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
# Run history and screenshots live in /app/.data. To keep them across containers, mount a volume
# there (docker run -v, or a volume in the host's settings). No VOLUME line: Railway rejects it.

# Settings come from the environment at run time, never baked into the image:
#   docker run --env-file .env.local -p 3000:3000 testpilot
CMD ["npm", "start"]
