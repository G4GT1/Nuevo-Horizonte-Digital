import bcrypt from 'bcrypt';
import { config } from 'dotenv';

config();

import { conexionBD } from '../data/db.js';
import { User } from '../models/user.model.js';

const SALT_ROUNDS = 12;

const seed = async () => {
    try {
        await conexionBD();

        const existe = await User.findOne({ role: 'superadmin' });
        if (existe) {
            console.log('Ya existe un superadmin en la base de datos. Saliendo sin cambios.');
            process.exit(0);
        }

        const email = process.env.SEED_ADMIN_EMAIL;
        const password = process.env.SEED_ADMIN_PASSWORD;
        const nombre = process.env.SEED_ADMIN_NOMBRE ?? 'Administrador';

        if (!email || !password) {
            console.error('Faltan SEED_ADMIN_EMAIL o SEED_ADMIN_PASSWORD en el .env');
            process.exit(1);
        }

        const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const admin = await User.create({
            nombre,
            apellidos: 'Sistema',
            email,
            password: hashPassword,
            role: 'superadmin',
            emailVerified: true,
            suspended: false
        });

        console.log(`✅ SuperAdmin creado correctamente`);
        console.log(`   Email:  ${admin.email}`);
        console.log(`   Nombre: ${admin.nombre}`);
        console.log(`   ID:     ${admin._id}`);
        process.exit(0);

    } catch (error) {
        console.error('Error al crear el superadmin:', error.message);
        process.exit(1);
    }
};

seed();
