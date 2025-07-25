# Stage 1: Build the application
# Use a full Node image to install dependencies
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your application source code
COPY . .

# Stage 2: Create the final, smaller production image
FROM node:20-alpine
WORKDIR /usr/src/app

# Copy dependencies from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules

# Copy application code from the builder stage
COPY --from=builder /usr/src/app/src ./src

# Expose the port the app runs on
EXPOSE 3000

# The command to start the server
CMD [ "node", "src/server.js" ]