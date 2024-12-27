# Use an official Node.js runtime as the base image
FROM node:16-alpine

# Install dependencies for C++, Java, and Python
RUN apk update && apk add --no-cache \
    g++ \
    openjdk11 \
    python3 \
    py3-pip \
    bash

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./ 

# Install dependencies for Node.js
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Run the server
CMD ["node", "server.js"]
