import { iniciarJobAlertas } from './alertas.job.js';
import { iniciarJobResumenSemanal } from './resumenSemanal.job.js';

export const iniciarJobs = () => {
    iniciarJobAlertas();
    iniciarJobResumenSemanal();
};
