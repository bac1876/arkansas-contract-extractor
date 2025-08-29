# Use full Node.js image (not Alpine) to avoid native module issues
FROM node:20-slim

# Install ImageMagick and required tools
RUN apt-get update && apt-get install -y \
    imagemagick \
    ghostscript \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies (all of them, including dev for ts-node)
RUN npm install

# Install TypeScript and ts-node for runtime
RUN npm install typescript ts-node

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

# Run the email monitor
CMD ["node", "-r", "ts-node/register", "email-monitor.ts"]