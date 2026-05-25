import api from './axios';

export const weatherApi = {
  getCurrent: () => api.get('/weather'),
};
