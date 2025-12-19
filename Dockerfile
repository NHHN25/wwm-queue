# Use Node.js 20 LTS
FROM node:20-alpine

# Install build dependencies for better-sqlite3
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Create data directory for SQLite
RUN mkdir -p /app/data

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
