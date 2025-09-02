# Use full Node.js image for better compatibility
FROM node:20

# Install dependencies for PDFKit and ImageMagick
# CRITICAL: Install all required libraries for PDF generation
RUN apt-get update && apt-get install -y \
    # ImageMagick for image processing
    imagemagick \
    libmagickwand-dev \
    ghostscript \
    # Delegate libraries for image formats
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libwebp-dev \
    # Canvas/Cairo dependencies for PDFKit
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    # Font support for PDFKit
    fonts-liberation \
    fonts-noto \
    fontconfig \
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

# Verify ImageMagick installation and fix PDF policy
RUN which convert && convert -version

# CRITICAL: Fix ImageMagick policy to allow PDF processing
# Railway/Docker often has restrictive policies that block PDF conversion
RUN sed -i '/disable ghostscript format types/,+6d' /etc/ImageMagick-6/policy.xml || true
RUN sed -i '/<policy domain="coder" rights="none" pattern="PDF" \/>/d' /etc/ImageMagick-6/policy.xml || true
RUN sed -i '/<policy domain="coder" rights="none" pattern="PS" \/>/d' /etc/ImageMagick-6/policy.xml || true
RUN sed -i '/<policy domain="coder" rights="none" pattern="EPS" \/>/d' /etc/ImageMagick-6/policy.xml || true
RUN sed -i '/<policy domain="coder" rights="none" pattern="XPS" \/>/d' /etc/ImageMagick-6/policy.xml || true

# Verify PDF conversion works
RUN echo '%PDF-1.4' > /tmp/test.pdf && \
    convert /tmp/test.pdf /tmp/test.png 2>&1 || \
    echo 'Warning: PDF conversion test failed, but continuing...'

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