import api from './axios';

export const reportsApi = {
  getReportData:  (params) => api.get('/reports/data', { params }),
  exportExcel:    (params) => api.get('/reports/export/excel', { params, responseType: 'blob' }),
  sendWeeklyNow:  ()       => api.post('/reports/weekly/send-now'),
};
