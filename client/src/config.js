// Centralized frontend config with environment support
const isDevelopment = import.meta.env.DEV;

// Prefer environment variable; fall back to sensible defaults per environment
const ENV_API_URL = import.meta.env.VITE_API_URL;
const DEFAULT_DEV_URL = "http://localhost:5050";
const DEFAULT_PROD_URL = " https://r0gfamvyd8.execute-api.eu-west-2.amazonaws.com/";

export const API_URL = ENV_API_URL || (isDevelopment ? DEFAULT_DEV_URL : DEFAULT_PROD_URL);

export const getApiUrl = () => API_URL;
