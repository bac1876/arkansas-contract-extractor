# Use Node.js 20 LTS version
FROM node:20-alpine

# Install ImageMagick for PDF processing
RUN apk add --no-cache \
    imagemagick \
    ghostscript

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for ts-node)
RUN npm ci

# Install TypeScript and ts-node globally
RUN npm install -g typescript ts-node

# Copy all source files
COPY . .

# Create necessary directories
RUN mkdir -p processed_contracts/pdfs && \
    mkdir -p processed_contracts/images && \
    mkdir -p processed_contracts/results && \
    mkdir -p processed_contracts/seller_net_sheets && \
    mkdir -p temp_images && \
    mkdir -p net_sheets_pdf && \
    mkdir -p net_sheets_csv && \
    mkdir -p agent_info_sheets && \
    mkdir -p gpt5_temp

# Build TypeScript (optional, since we're using ts-node)
RUN npm run build || true

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('OK')" || exit 1

# Run the email monitor
CMD ["npm", "run", "monitor"]