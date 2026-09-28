# UI container: runs uis/website (port 3000) and uis/backoffice (port 3001) together.

# Start from the official Node image, Alpine version (a very small Linux).
# Node 22 is used because Next.js 16 needs Node 20.9 or newer.
FROM node:22-alpine

# Next.js needs this compatibility library to run correctly on Alpine.
RUN apk add --no-cache libc6-compat

# All the commands below run inside the /app folder in the container.
WORKDIR /app

# Install the website's dependencies.
# Only the package files are copied first, so Docker can skip this slow step
# on future builds when only the code changed, not the dependency list.
COPY website/package.json website/package-lock.json ./website/
RUN cd website && npm ci

# Install the backoffice's dependencies, separately, the same way.
COPY backoffice/package.json backoffice/package-lock.json ./backoffice/
RUN cd backoffice && npm ci

# Copy the rest of the UI code (including start.sh) into the container.
COPY . .

# Document which ports the two apps listen on.
EXPOSE 3000 3001

# When the container starts, run start.sh, which launches both apps.
CMD ["sh", "./start.sh"]