FROM node:18-alpine AS base

# Install dependencies only when needed
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json ./
RUN npm install

# Rebuild the source code only when needed
COPY . .

# Next.js collects completely anonymous telemetry data about general usage.
# Learn more here: https://nextjs.org/telemetry
# Disable telemetry during the build.
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
ENV NODE_ENV production
ENV PORT 3000
EXPOSE 3000

CMD ["npm", "start"]
