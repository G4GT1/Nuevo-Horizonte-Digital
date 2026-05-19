import { config } from 'dotenv';

config();

// Servidor
export const PORT = process.env.PORT;
export const NODE_ENV = process.env.NODE_ENV;

// Base de datos
export const MONGODB_URI = process.env.MONGODB_URI;
export const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

// JWT
export const SECRET_KEY = process.env.SECRET_KEY;
export const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY;

// CORS
export const FRONTEND_URL = process.env.FRONTEND_URL;

// Resend
export const RESEND_API_KEY = process.env.RESEND_API_KEY;
export const EMAIL_FROM = process.env.EMAIL_FROM;

// FieldClimate
export const FIELDCLIMATE_PUBLIC_KEY = process.env.FIELDCLIMATE_PUBLIC_KEY;
export const FIELDCLIMATE_PRIVATE_KEY = process.env.FIELDCLIMATE_PRIVATE_KEY;
export const FIELDCLIMATE_BASE_URL = process.env.FIELDCLIMATE_BASE_URL;

// Cesens
export const CESENS_BASE_URL = process.env.CESENS_BASE_URL;
export const CESENS_NOMBRE = process.env.CESENS_NOMBRE;
export const CESENS_CLAVE = process.env.CESENS_CLAVE;

// Open-Meteo
export const OPENMETEO_BASE_URL = process.env.OPENMETEO_BASE_URL;
export const STATION_LATITUDE = process.env.STATION_LATITUDE;
export const STATION_LONGITUDE = process.env.STATION_LONGITUDE;

// Groq
export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const GROQ_BASE_URL = process.env.GROQ_BASE_URL;
export const GROQ_MODEL = process.env.GROQ_MODEL;

// Web Push
export const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT;

// Seed
export const SEED_ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
export const SEED_ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
export const SEED_ADMIN_NOMBRE = process.env.SEED_ADMIN_NOMBRE;

// Swagger
export const SWAGGER_ENABLED = process.env.SWAGGER_ENABLED;
