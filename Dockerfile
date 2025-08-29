# Use full Node.js image for better compatibility
FROM node:20

# Install dependencies for Playwright and ImageMagick
RUN apt-get update && apt-get install -y \
    imagemagick \
    ghostscript \
    # Dependencies for Playwright/Chromium
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libatspi2.0-0 \
    libx11-6 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libxcb1 \
    libxkbcommon0 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
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