import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { FileText, Download, Loader2, Calendar, FileSpreadsheet, Radio, AlertCircle } from 'lucide-react';
import { reportsApi } from '@features/reports/api/reports.api';
import { stationsApi } from '@features/stations/api/stations.api';
import { format, subDays } from 'date-fns';
import ReportDocument from '@features/reports/components/InformePDF';

const fmt = (d) => format(new Date(d), 'yyyy-MM-dd');

/**
 * Extrae el ID unico de una estacion segun su fuente.
 * @param {Object} st - Objeto estacion.
 * @returns {string}
 */
function getStationId(st) {
  return st.source === 'fieldclimate'
    ? (st.name?.original ?? st._id)
    : String(st.id ?? st.id_ubicacion);
}
/**
 * Devuelve el nombre legible de una estacion segun su fuente.
 * @param {Object} st - Objeto estacion.
 * @returns {string}
 */
function getStationName(st) {
  return st.source === 'fieldclimate'
    ? (st.name?.custom ?? st.name?.original ?? 'FC')
    : (st.nombre ?? st.ubicacion ?? `Cesens #${st.id}`);
}

/**
 * Pagina de informes. Formulario de configuracion (estacion, periodo, formato)
 * con previsualizacion PDF en panel derecho y exportacion a Excel.
 * @component
 * @returns {JSX.Element}
 */
export default function ReportsPage() {
  const { t } = useTranslation();

  const [stationId, setStationId]     = useState('');
  const [selectedSt, setSelectedSt]   = useState(null);
  const [from, setFrom]               = useState(fmt(subDays(new Date(), 7)));
  const [to, setTo]                   = useState(fmt(new Date()));
  const [reportData, setReportData]   = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');
  const [excelLoading, setExcelLoading] = useState(false);

  const { data: stData } = useQuery({
    queryKey: ['stations-all'],
    queryFn:  () => stationsApi.getAll().then((r) => r.data.data.estaciones ?? []),
    staleTime: 120_000,
  });

  const stations = stData ?? [];
  const fcStations     = useMemo(() => stations.filter(s => s.source === 'fieldclimate'), [stations]);
  const cesensStations = useMemo(() => stations.filter(s => s.source === 'cesens'),       [stations]);

  const handleStationChange = (e) => {
    const id = e.target.value;
    setStationId(id);
    setReportData(null);
    setError('');
    const st = stations.find(s => getStationId(s) === id) ?? null;
    setSelectedSt(st);
  };

  const previsualizar = async () => {
    if (!stationId || !selectedSt) { setError('Selecciona una estación'); return; }
    if (!from || !to)              { setError('Selecciona un rango de fechas'); return; }
    setLoading(true);
    setError('');
    setReportData(null);
    try {
      const { data } = await reportsApi.getReportData({
        stationId, source: selectedSt.source, from, to,
      });
      if (!data?.data?.resumen?.length) {
        setError('No hay datos para el período seleccionado');
        return;
      }
      setReportData(data.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const downloadExcel = async () => {
    if (!stationId || !selectedSt) { setError('Selecciona una estación'); return; }
    setExcelLoading(true);
    setError('');
    try {
      const { data } = await reportsApi.exportExcel({
        stationId, source: selectedSt.source, from, to,
      });
      const name = getStationName(selectedSt).replace(/[^a-z0-9]/gi, '_');
      const blob = new Blob([data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `informe_${name}_${from}_${to}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Error al generar el Excel');
    } finally {
      setExcelLoading(false);
    }
  };

  const stationName = selectedSt ? getStationName(selectedSt) : '';
  const pdfFilename = `informe_${stationName.replace(/[^a-z0-9]/gi, '_')}_${from}_${to}.pdf`;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-0">
      <div className="mb-4 shrink-0">
        <h1 className="page-title">{t('reports.title')}</h1>
        <p className="page-subtitle">{t('reports.subtitle')}</p>
      </div>

      <div className="flex gap-5 flex-1 min-h-0">

        {/* ── Left: form ── */}
        <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">

          {/* Station */}
          <div className="card p-4 space-y-4">
            <h2 className="font-heading font-semibold text-text text-sm">Configurar informe</h2>

            <div>
              <label className="label">Estación</label>
              <select
                className="input text-sm"
                value={stationId}
                onChange={handleStationChange}
              >
                <option value="">— Selecciona —</option>
                {fcStations.length > 0 && (
                  <optgroup label="FieldClimate">
                    {fcStations.map(st => {
                      const id = getStationId(st);
                      return <option key={id} value={id}>{getStationName(st)}</option>;
                    })}
                  </optgroup>
                )}
                {cesensStations.length > 0 && (
                  <optgroup label="Cesens">
                    {cesensStations.map(st => {
                      const id = getStationId(st);
                      return <option key={id} value={id}>{getStationName(st)}</option>;
                    })}
                  </optgroup>
                )}
              </select>
            </div>

            {selectedSt && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <Radio size={11} className="text-primary" />
                <span>Fuente:</span>
                <span className={`badge text-[10px] ${selectedSt.source === 'fieldclimate' ? 'badge-info' : 'badge-green'}`}>
                  {selectedSt.source === 'fieldclimate' ? 'FieldClimate' : 'Cesens'}
                </span>
              </div>
            )}

            <div>
              <label className="label">Período</label>
              <div className="space-y-2">
                <div className="relative">
                  <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
                  <input
                    type="date"
                    className="input pl-8 text-sm"
                    value={from}
                    onChange={(e) => { setFrom(e.target.value); setReportData(null); }}
                  />
                </div>
                <div className="relative">
                  <Calendar size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
                  <input
                    type="date"
                    className="input pl-8 text-sm"
                    value={to}
                    onChange={(e) => { setTo(e.target.value); setReportData(null); }}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 text-danger text-xs bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <button
              onClick={previsualizar}
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
            >
              {loading ? (
                <><Loader2 size={14} className="animate-spin" /> Cargando...</>
              ) : (
                <><FileText size={14} /> Previsualizar</>
              )}
            </button>

            {reportData ? (
              <PDFDownloadLink
                document={
                  <ReportDocument
                    data={reportData}
                    stationName={stationName}
                    from={from}
                    to={to}
                  />
                }
                fileName={pdfFilename}
                className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
              >
                {({ loading: pdfLoading }) =>
                  pdfLoading
                    ? <><Loader2 size={14} className="animate-spin" /> Preparando PDF...</>
                    : <><Download size={14} /> Descargar PDF</>
                }
              </PDFDownloadLink>
            ) : (
              <button disabled className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm opacity-40 cursor-not-allowed">
                <Download size={14} /> Descargar PDF
              </button>
            )}

            <button
              onClick={downloadExcel}
              disabled={excelLoading || !stationId}
              className="btn-secondary w-full flex items-center justify-center gap-2 py-2.5 text-sm"
            >
              {excelLoading ? (
                <><Loader2 size={14} className="animate-spin" /> Exportando...</>
              ) : (
                <><FileSpreadsheet size={14} /> Descargar Excel</>
              )}
            </button>
          </div>
        </div>

        {/* ── Right: preview ── */}
        <div className="flex-1 card overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-text-muted">
              <Loader2 size={32} className="animate-spin text-primary" />
              <p className="text-sm">Generando informe...</p>
            </div>
          ) : reportData ? (
            <PDFViewer width="100%" height="100%" showToolbar={true} style={{ border: 'none' }}>
              <ReportDocument
                data={reportData}
                stationName={stationName}
                from={from}
                to={to}
              />
            </PDFViewer>
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-text-muted px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <FileText size={28} className="text-primary" />
              </div>
              <div>
                <p className="font-heading font-semibold text-text text-sm mb-1">Vista previa del informe</p>
                <p className="text-xs text-text-muted">
                  Selecciona una estación y un rango de fechas,<br />
                  luego pulsa <strong className="text-text">Previsualizar</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
