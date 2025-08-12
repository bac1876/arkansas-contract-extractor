# Use Node.js 20 LTS version (required for some packages)
FROM node:20-alpine

# Install ImageMagick and required dependencies for canvas
RUN apk add --no-cache \
    imagemagick \
    ghostscript \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pkgconf

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy TypeScript config and source files
COPY tsconfig.json ./
COPY *.ts ./
COPY public ./public/
COPY .env.example ./

# Install TypeScript and ts-node globally for runtime
RUN npm install -g typescript ts-node

# Build the application
RUN npm run build

# Create required directories
RUN mkdir -p uploads temp_extraction

# Expose port
EXPOSE 3006

# Set environment variable for production
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]