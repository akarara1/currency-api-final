# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the container
COPY package*.json ./

# Install the app dependencies
RUN npm install

# Copy the rest of the application files to the container
COPY . .

# Expose the application port
EXPOSE 3000

# Define the environment variables
ENV PORT=3000

# Start the application
CMD [ "node", "index.js" ]