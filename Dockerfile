# Use Node.js 20 for better compatibility
FROM node:20

# Install ImageMagick and dependencies
# Based on proven Version 4.0 setup
RUN apt-get update && apt-get install -y \
    # ImageMagick with all format support
    imagemagick \
    libmagickwand-dev \
    # Ghostscript for PDF support
    ghostscript \
    # Build tools
    build-essential \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Install TypeScript and ts-node for runtime
RUN npm install typescript ts-node

# Install Playwright and its browser
RUN npx playwright install chromium
RUN npx playwright install-deps chromium

# Copy all source files
COPY . .

# Fix ImageMagick policy to allow PDF processing
# This is the critical fix from the deployment guide
RUN sed -i 's/<policy domain="coder" rights="none" pattern="PDF" \/>/<policy domain="coder" rights="read|write" pattern="PDF" \/>/g' /etc/ImageMagick-6/policy.xml || true

# Create necessary directories
RUN mkdir -p processed_contracts/pdfs \
    processed_contracts/images \
    processed_contracts/results \
    processed_contracts/seller_net_sheets \
    temp_images \
    net_sheets_pdf \
    net_sheets_csv \
    agent_info_sheets \
    gpt5_temp

# Set environment variable for Playwright
ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers
ENV NODE_ENV=production

# Expose port for health checks
EXPOSE 3000

# Use the start script that includes health check
CMD ["node", "start.js"]