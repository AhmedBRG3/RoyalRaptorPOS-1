// Centralized frontend config with environment support
const isDevelopment = import.meta.env.DEV;

// Use local server for development, AWS API Gateway for production
// export const API_URL = "https://r0gfamvyd8.execute-api.eu-west-2.amazonaws.com/";
export const API_URL = "http://localhost:5050";

// Fallback to localhost if no environment variable is set
export const getApiUrl = () => {
  // In production, use the environment variable or your deployed API Gateway URL
  // return "https://r0gfamvyd8.execute-api.eu-west-2.amazonaws.com/";
  return "http://localhost:5050"
};
