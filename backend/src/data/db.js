import mongoose from 'mongoose';
import { MONGODB_URI, MONGODB_DB_NAME } from '../config.js';

let conexion = null;

export const conexionBD = async () => {
    try {
        if (conexion && mongoose.connection.readyState === 1) {
            console.log('Ya existe una conexión activa a MongoDB');
            return conexion;
        }

        conexion = await mongoose.connect(MONGODB_URI, {
            dbName: MONGODB_DB_NAME,
            serverSelectionTimeoutMS: 30000
        });

        console.log('Conexión exitosa a MongoDB con Mongoose');
        return conexion.connection;

    } catch (error) {
        console.error(`Error al conectar a MongoDB: ${error.message}`);
        if (mongoose.connection) {
            await mongoose.connection.close();
        }
        throw new Error('No se pudo conectar a la base de datos');
    }
};
