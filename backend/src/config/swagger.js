import swaggerJSDoc from 'swagger-jsdoc';
import { FRONTEND_URL } from '../config.js';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Horizonte Verde Digital API',
            version: '1.0.0',
            description: 'API REST para la plataforma unificada de sensores agrícolas del IES Galileo Galilei (Córdoba). Integra FieldClimate (GSM) y Cesens (LoRa) con gestión de usuarios, alertas, exportaciones e IA.'
        },
        servers: [
            { url: 'http://localhost:4000', description: 'Desarrollo local' },
            { url: FRONTEND_URL?.replace(':5173', ':4000') ?? 'http://localhost:4000', description: 'Servidor configurado' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Access token JWT obtenido en /api/auth/login'
                }
            },
            schemas: {
                // ── Auth ──────────────────────────────────────────────────
                RegistroBody: {
                    type: 'object',
                    required: ['nombre', 'apellidos', 'email', 'password'],
                    properties: {
                        nombre: { type: 'string', example: 'María' },
                        apellidos: { type: 'string', example: 'García López' },
                        email: { type: 'string', format: 'email', example: 'maria@ejemplo.com' },
                        password: { type: 'string', minLength: 8, example: 'Contraseña123!' }
                    }
                },
                LoginBody: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string' }
                    }
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        accessToken: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string' },
                                nombre: { type: 'string' },
                                apellidos: { type: 'string' },
                                email: { type: 'string' },
                                role: { type: 'string', enum: ['superadmin', 'tecnico', 'alumnado'] },
                                preferences: { type: 'object' }
                            }
                        }
                    }
                },
                InvitacionAcceptBody: {
                    type: 'object',
                    required: ['token', 'nombre', 'apellidos', 'password'],
                    properties: {
                        token: { type: 'string' },
                        nombre: { type: 'string' },
                        apellidos: { type: 'string' },
                        password: { type: 'string', minLength: 8 }
                    }
                },
                // ── Admin ─────────────────────────────────────────────────
                CrearUsuarioBody: {
                    type: 'object',
                    required: ['nombre', 'apellidos', 'email', 'password'],
                    properties: {
                        nombre: { type: 'string' },
                        apellidos: { type: 'string' },
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', minLength: 8 },
                        role: { type: 'string', enum: ['superadmin', 'tecnico', 'alumnado'], default: 'tecnico' }
                    }
                },
                EnviarInvitacionBody: {
                    type: 'object',
                    required: ['email', 'role'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        role: { type: 'string', enum: ['tecnico', 'alumnado'] }
                    }
                },
                // ── Alertas ───────────────────────────────────────────────
                ConfigAlertaBody: {
                    type: 'object',
                    required: ['stationId', 'source', 'metric', 'operator', 'threshold'],
                    properties: {
                        stationId: { type: 'string', example: 'FC001' },
                        source: { type: 'string', enum: ['fieldclimate', 'cesens'] },
                        metric: { type: 'string', example: 'temperature' },
                        operator: { type: 'string', enum: ['gt', 'lt', 'eq'] },
                        threshold: { type: 'number', example: 35 },
                        active: { type: 'boolean', default: true }
                    }
                },
                // ── IA ────────────────────────────────────────────────────
                ChatBody: {
                    type: 'object',
                    required: ['mensajes'],
                    properties: {
                        mensajes: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    role: { type: 'string', enum: ['user', 'assistant'] },
                                    content: { type: 'string' }
                                }
                            }
                        }
                    }
                },
                BusquedaBody: {
                    type: 'object',
                    required: ['pregunta'],
                    properties: {
                        pregunta: { type: 'string', example: '¿Cuál es la temperatura actual en la estación principal?' }
                    }
                },
                // ── Push ──────────────────────────────────────────────────
                SuscripcionBody: {
                    type: 'object',
                    required: ['subscription'],
                    properties: {
                        subscription: {
                            type: 'object',
                            properties: {
                                endpoint: { type: 'string' },
                                keys: {
                                    type: 'object',
                                    properties: {
                                        p256dh: { type: 'string' },
                                        auth: { type: 'string' }
                                    }
                                }
                            }
                        }
                    }
                },
                // ── Health ────────────────────────────────────────────────
                HealthResponse: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
                        timestamp: { type: 'string', format: 'date-time' },
                        uptime: { type: 'string', example: '2h 35min' },
                        version: { type: 'string', example: '1.0.0' },
                        services: {
                            type: 'object',
                            properties: {
                                mongodb: { $ref: '#/components/schemas/ServiceStatus' },
                                fieldclimate: { $ref: '#/components/schemas/ServiceStatus' },
                                cesens: { $ref: '#/components/schemas/ServiceStatus' },
                                groq: { $ref: '#/components/schemas/ServiceStatus' }
                            }
                        }
                    }
                },
                ServiceStatus: {
                    type: 'object',
                    properties: {
                        status: { type: 'string', enum: ['ok', 'error'] },
                        latencia: { type: 'string', example: '142ms' },
                        detalle: { type: 'string', description: 'Solo presente si status=error' }
                    }
                },
                // ── Genéricos ─────────────────────────────────────────────
                MensajeExito: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' }
                    }
                }
            }
        },
        tags: [
            { name: 'Auth', description: 'Autenticación, registro y gestión de acceso' },
            { name: 'Administración', description: 'Gestión de usuarios e invitaciones (solo superadmin)' },
            { name: 'Estaciones', description: 'Datos de sensores FieldClimate y Cesens' },
            { name: 'Alertas', description: 'Configuración y gestión de alertas de umbral' },
            { name: 'Informes', description: 'Exportación de datos en PDF y Excel' },
            { name: 'IA', description: 'Chatbot y buscador inteligente con Groq / Llama 3.3' },
            { name: 'Meteorología', description: 'Predicción del tiempo con Open-Meteo' },
            { name: 'Notificaciones', description: 'Notificaciones internas de la plataforma' },
            { name: 'Push', description: 'Suscripción y gestión de notificaciones push' },
            { name: 'Actividad', description: 'Log de acciones de usuarios' },
            { name: 'Health', description: 'Estado del sistema y servicios externos' }
        ]
    },
    apis: ['./src/routes/*.route.js']
};

export const swaggerSpec = swaggerJSDoc(options);
