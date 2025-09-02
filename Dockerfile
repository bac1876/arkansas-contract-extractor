# Use full Node.js image for better compatibility
FROM node:20

# Install dependencies for PDFKit and ImageMagick
# CRITICAL: Order matters! Delegate libraries MUST be installed BEFORE ImageMagick
# See Section 4.1 of deployment guide
RUN apt-get update && apt-get install -y \
    # Build essentials first
    build-essential \
    curl \
    ca-certificates \
    \
    # STEP 1: Install delegate libraries FIRST (BEFORE ImageMagick!)
    libjpeg-dev \
    libpng-dev \
    libtiff-dev \
    libwebp-dev \
    libgif-dev \
    librsvg2-dev \
    \
    # STEP 2: Install Ghostscript for PDF support
    ghostscript \
    libgs-dev \
    \
    # STEP 3: NOW install ImageMagick (AFTER all delegates)
    imagemagick \
    libmagickwand-dev \
    \
    # Canvas/Cairo dependencies for PDFKit
    libcairo2-dev \
    libpango1.0-dev \
    \
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

# Copy our custom ImageMagick policy (Section 4.2 of deployment guide)
COPY config/policy.xml /app/config/policy.xml

# Set ImageMagick to use our custom policy instead of system default
ENV MAGICK_CONFIGURE_PATH=/app/config

# Verify ImageMagick installation and delegates
RUN echo "🎨 Verifying ImageMagick installation..." && \
    which convert && convert -version && \
    echo "📋 Checking supported formats..." && \
    convert -list format | grep -E "JPEG|PNG|PDF" && \
    echo "🔍 Checking delegates..." && \
    convert -list delegate | grep -E "jpeg|png|ps|pdf" && \
    echo "📜 Checking active policy..." && \
    convert -list policy && \
    echo "✅ ImageMagick verification complete"

# Fix ImageMagick policy permissions (may be in different locations)
RUN for policy in /etc/ImageMagick-6/policy.xml /etc/ImageMagick-7/policy.xml /etc/ImageMagick/policy.xml; do \
      if [ -f "$policy" ]; then \
        echo "Fixing policy at: $policy" && \
        sed -i '/<policy domain="coder" rights="none" pattern="PDF" \/>/d' "$policy" && \
        sed -i '/<policy domain="coder" rights="none" pattern="PS" \/>/d' "$policy" && \
        sed -i '/<policy domain="coder" rights="none" pattern="EPS" \/>/d' "$policy" && \
        sed -i '/<policy domain="coder" rights="none" pattern="XPS" \/>/d' "$policy"; \
      fi; \
    done

# Verify PDF conversion works
RUN echo '%PDF-1.4' > /tmp/test.pdf && \
    convert /tmp/test.pdf /tmp/test.png 2>&1 && \
    echo '✅ PDF conversion test successful!' || \
    echo '⚠️ PDF conversion test failed, but continuing...'

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
# This is critical - start.js handles health checks and proper initialization
CMD ["node", "start.js"]