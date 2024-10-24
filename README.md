# Currency Exchange API Documentation

This is the documentation for the **Currency Exchange API**, which allows users to convert currencies using the ApyHub API and Redis for caching.

## Table of Contents
- [Project Setup](#project-setup)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
  - [POST `/convert`](#post-convert)
- [Swagger Documentation](#swagger-documentation)
- Troubleshooting
---

## Project Setup

### Prerequisites
Before you can run the application, make sure you have the following installed:
- **Node.js** (version 12.x or higher)
- **Redis** (local or Docker setup)
- **Docker** (optional but recommended for running the app with Docker)

### Installation

1 - Clone the repository:
   ```bash
   git clone https://github.com/currency-api.git
   cd currency-api
   ```

2 - Install the required dependencies:
    
  ```bash
    npm install
  ```
## Environment Variables

  Create a *.env* file in the root directory of the project and add the following variables:
  
  ```bash
  NODE_ENV=development
  APY_API_KEY=your-apyhub-api-key
  PORT=3000
  ```
Replace *your-apyhub-api-key* with your actual ApyHub API key.

## Running the Application
### Option 1: Run Locally
1 - Make sure Redis is running locally. If Redis isn't installed, you can install it using Homebrew (MacOS)
  ```bash
  brew install redis
  brew services start redis
  ```
2- Run the Application
  ```bash
  NODE_ENV=development node index.js
  ```
The server should be running at http://localhost:3000.

### Option 2: Running with Docker

1- Ensure [Docker](https://docs.docker.com/desktop/install/mac-install/) is installed. 

2- Run the application using Docker Compose:
```bash
docker-compose up --build
```
The application and Redis will run inside Docker containers. The API will be available at http://localhost:3000.

## API Endpoints
### POST `/convert`
- Description: Convert a currency from one source to multiple target currencies.
- Endpoint: /convert
- Method: POST
- **Request Body** (JSON):
  ```javascript
  {
    "source": "usd",
    "targets": ["eur", "inr"],
    "date": "2023-10-01"
  }
  ```
  - **source**: Source currency code (string, required)
  - **targets**: Array of target currency codes (array of strings, required)
  - **date**: (Optional) Date in yyyy-mm-dd format. Defaults to today.
- **Responses**:
  - **200 OK:** Successful response, with conversion rates for each target currency.
  ```javascript
  {
  "source": "usd",
  "conversions": {
    "eur": 0.85,
    "inr": 74.58
    }
  }
  ```
- **400 Bad Request:** When source or targets are missing or invalid.

- **500 Internal Server Error:** When something goes wrong, such as API or Redis failures.
## Swagger Documentation
The API is documented using **Swagger** and can be accessed via the `/api-docs` endpoint.
### Accessing Swagger UI
Once the application is running, you can access the Swagger UI in your browser by visiting:
```bash
http://localhost:3000/api-docs
```
### Swagger Setup
In the `index.js` file, Swagger has been set up using the following configuration:
```javascript
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: "3.0.0",
        info: {
            title: "Currency Exchange API",
            version: "1.0.0",
            description: "API to convert currencies using ApyHub and Redis caching",
        },
        servers: [
            {
                url: "http://localhost:3000",
                description: "Local server"
            }
        ],
    },
    apis: ["./index.js"], // Path to the API documentation in JSDoc format
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
```
This setup provides an interactive API documentation interface that allows you to test the API endpoints directly from the browser.

## Troubleshooting
If you encounter issues with Redis or the API, ensure that:
 - **Redis is running** locally or in Docker.
 - **API key is valid:** Ensure the `APY_API_KEY` is set correctly in the `.env` file.
 - **Swagger UI** is accessible via `http://localhost:3000/api-docs`.


