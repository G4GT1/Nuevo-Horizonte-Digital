import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ArrowLeft, RefreshCw, Download, Calendar,
  Battery, Sun, Thermometer, Droplets, CloudRain,
  Wind, Leaf, Gauge, Activity,
  ChevronDown, ChevronUp, MapPin, Check,
} from 'lucide-react';
import { useAuthStore } from '@shared/store/authStore';
import {
  ResponsiveContainer, LineChart, Line, CartesianGrid,
  XAxis, YAxis, Tooltip, Legend,
} from 'recharts';
import { stationsApi } from '@features/stations/api/stations.api';
import { format, subDays } from 'date-fns';
import { generarDescripcion } from '@shared/lib/estaciones.helpers';
import { useUiStore } from '@shared/store/uiStore';

const METRIC_COLORS = ['#3ECF8E', '#38BDF8', '#F59E0B', '#EF4444', '#A78BFA', '#FB923C'];

/** Formatea una fecha a cadena yyyy-MM-dd para inputs date. */
function formatDate(d) { return format(new Date(d), 'yyyy-MM-dd'); }

/**
 * Pagina de detalle de estacion. Muestra datos en vivo, grafica historica por metrica
 * y descripcion generada. Soporta fuentes fieldclimate y cesens via parametros de ruta.
 * @component
 * @returns {JSX.Element}
 */
export default function StationDetailPage() {
  const { source, id } = useParams();
  const { t } = useTranslation();
  const { setPageSubtitle } = useUiStore();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const canEditMeta = user?.role === 'superadmin' || user?.role === 'tecnico';

  const [from, setFrom] = useState(formatDate(subDays(new Date(), 7)));
  const [to, setTo] = useState(formatDate(new Date()));

  const isFC = source === 'fieldclimate';

  const { data: stData, isLoading: stLoading } = useQuery({
    queryKey: ['station', source, id],
    queryFn: () =>
      isFC
        ? stationsApi.getFCStation(id).then((r) => r.data.data.estacion)
        : stationsApi.getCesensStation(id).then((r) => r.data.data.estacion),
    staleTime: 120_000,
  });

  const { data: liveData, isLoading: liveLoading, refetch: refetchLive } = useQuery({
    queryKey: ['station-live', source, id],
    queryFn: () =>
      isFC
        ? stationsApi.getFCData(id).then((r) => r.data.data.datos)
        : stationsApi.getCesensData(id).then((r) => r.data.data.datos),
    staleTime: 60_000,
  });

  const { data: histData, isLoading: histLoading, refetch: refetchHist } = useQuery({
    queryKey: ['station-history', source, id, from, to],
    queryFn: () =>
      isFC
        ? stationsApi.getFCHistory(id, from, to).then((r) => {
            const d = r.data.data.datos;
            console.log('[FC HIST] raw completo:', {
              tipo: typeof d,
              esArray: Array.isArray(d),
              keys: d ? Object.keys(d) : null,
              numDates: d?.dates?.length,
              numSensores: d?.data?.length,
              sensor0: d?.data?.[0]
                ? { name: d.data[0].name, name_original: d.data[0].name_original, valueKeys: Object.keys(d.data[0].values ?? {}) }
                : null,
              fecha0: d?.dates?.[0],
            });
            return d;
          })
        : stationsApi.getCesensHistory(id, from, to).then((r) => r.data.data.datos),
    staleTime: 300_000,
    enabled: false,
  });

  const { data: metaData } = useQuery({
    queryKey: ['station-meta', source, id],
    queryFn: () => stationsApi.getMeta(source, id).then(r => r.data.data.meta),
    staleTime: 300_000,
    enabled: canEditMeta,
  });

  const [coordEdit, setCoordEdit] = useState(false);

  const autoCoords = (() => {
    if (!stData) return null;
    if (isFC) {
      const geo = stData.info?.geo ?? stData.geo ?? {};
      const lat = geo.lat ?? geo.latitude ?? stData.lat;
      const lon = geo.lon ?? geo.lng ?? geo.longitude ?? stData.lon ?? stData.lng;
      if (lat != null && lon != null) {
        const la = parseFloat(lat), lo = parseFloat(lon);
        if (!isNaN(la) && !isNaN(lo)) return { lat: la, lon: lo };
      }
    } else {
      if (stData.latitud != null && stData.longitud != null)
        return { lat: parseFloat(stData.latitud), lon: parseFloat(stData.longitud) };
    }
    return null;
  })();

  const [latInput, setLatInput] = useState('');
  const [lonInput, setLonInput] = useState('');

  useEffect(() => {
    if (coordEdit) {
      setLatInput(autoCoords?.lat ?? metaData?.lat ?? '');
      setLonInput(autoCoords?.lon ?? metaData?.lon ?? '');
    }
  }, [coordEdit, stData, metaData]);

  const metaMut = useMutation({
    mutationFn: (data) => stationsApi.saveMeta(source, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations-all'] });
      queryClient.invalidateQueries({ queryKey: ['station-meta', source, id] });
      setCoordEdit(false);
    },
  });

  const stationName = isFC
    ? (stData?.name?.custom ?? stData?.name?.original ?? id)
    : (stData?.nombre ?? stData?.ubicacion ?? `Cesens #${id}`);

  useEffect(() => {
    if (stationName) setPageSubtitle(stationName);
  }, [stationName]);

  const descripcion = liveData
    ? generarDescripcion(liveData.principal ?? [], liveData.detalle ?? [])
    : null;

  const chartData = histData
    ? (isFC ? parseFCChart(histData) : parseCesensChart(histData))
    : [];

  const allMetrics = chartData.length > 0
    ? Object.keys(chartData[0]).filter(k => k !== 'fecha')
    : [];

  const metricColor = Object.fromEntries(
    allMetrics.map((k, i) => [k, METRIC_COLORS[i % METRIC_COLORS.length]])
  );

  const [selectedMetrics, setSelectedMetrics] = useState(new Set());

  useEffect(() => {
    if (allMetrics.length === 0) return;
    const defaults = allMetrics.filter(k => /temperatura|humedad/i.test(k));
    setSelectedMetrics(new Set(defaults.length > 0 ? defaults : allMetrics));
  }, [histData]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMetric = (key) =>
    setSelectedMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link to="/stations" className="btn-ghost p-2">
          <ArrowLeft size={16} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="page-title">{stLoading ? '...' : stationName}</h1>
            </div>
          <p className="page-subtitle">{isFC ? 'FieldClimate' : 'Cesens'} · ID: {id}</p>
          {descripcion && (
            <p className="mt-1 text-[11px] text-text-subtle tracking-wide">
              {descripcion}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEditMeta && (
            <button
              onClick={() => setCoordEdit(v => !v)}
              className={`btn-ghost p-2 ${coordEdit ? 'text-primary' : ''}`}
              title="Configurar coordenadas en mapa"
            >
              <MapPin size={15} />
            </button>
          )}
          <button onClick={() => refetchLive()} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Coord editor */}
      {coordEdit && canEditMeta && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-primary shrink-0" />
            <span className="text-text text-sm font-medium">Posición en el mapa</span>
          </div>

          {autoCoords && (
            <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 text-xs">
              <Check size={12} className="text-primary shrink-0" />
              <span className="text-text-muted">
                Coordenadas detectadas:
                <span className="text-text font-mono ml-1">{autoCoords.lat.toFixed(5)}, {autoCoords.lon.toFixed(5)}</span>
              </span>
              <button
                onClick={() => metaMut.mutate(autoCoords)}
                disabled={metaMut.isPending}
                className="btn-primary text-xs px-3 py-1 ml-auto flex items-center gap-1.5"
              >
                {metaMut.isPending ? 'Guardando…' : 'Guardar en mapa'}
              </button>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-text-muted text-[11px]">Latitud manual</label>
              <input
                type="number" step="any"
                placeholder={autoCoords ? String(autoCoords.lat) : '37.8897'}
                value={latInput}
                onChange={e => setLatInput(e.target.value)}
                className="input py-1.5 px-2 text-xs w-36"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-text-muted text-[11px]">Longitud manual</label>
              <input
                type="number" step="any"
                placeholder={autoCoords ? String(autoCoords.lon) : '-4.7749'}
                value={lonInput}
                onChange={e => setLonInput(e.target.value)}
                className="input py-1.5 px-2 text-xs w-36"
              />
            </div>
            <button
              onClick={() => metaMut.mutate({ lat: parseFloat(latInput), lon: parseFloat(lonInput) })}
              disabled={metaMut.isPending || !latInput || !lonInput}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1.5"
            >
              <Check size={12} />
              {metaMut.isPending ? 'Guardando…' : 'Guardar manual'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Live data */}
      <div>
        <h2 className="font-heading font-semibold text-text text-sm mb-3">{t('stations.currentData')}</h2>
        {liveLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-card rounded-xl border border-border h-[130px] animate-pulse" />
            ))}
          </div>
        ) : (
          <LiveDataGrid data={liveData} source={source} />
        )}
      </div>

      {/* Historical */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-border">
          <h2 className="font-heading font-semibold text-text text-sm">{t('stations.history')}</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-text-subtle" />
              <input
                type="date"
                className="input py-1.5 px-2 text-xs w-32"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <span className="text-text-subtle text-xs">—</span>
              <input
                type="date"
                className="input py-1.5 px-2 text-xs w-32"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <button onClick={() => refetchHist()} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1.5">
              <RefreshCw size={12} />
              {t('stations.loadHistory')}
            </button>
          </div>
        </div>
        <div className="p-4">
          {histLoading ? (
            <div className="h-56 flex items-center justify-center text-text-muted text-sm">{t('common.loading')}</div>
          ) : chartData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-text-muted text-sm">
              {histData ? t('stations.noData') : 'Selecciona un rango y carga el histórico'}
            </div>
          ) : (
            <>
              {allMetrics.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {allMetrics.map(key => {
                    const active = selectedMetrics.has(key);
                    const color  = metricColor[key];
                    return (
                      <button
                        key={key}
                        onClick={() => toggleMetric(key)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
                          active ? 'opacity-100' : 'border-border text-text-muted opacity-40 hover:opacity-60'
                        }`}
                        style={active ? { color, borderColor: color, background: `${color}18` } : {}}
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ background: active ? color : '#4D7060' }}
                        />
                        {key}
                      </button>
                    );
                  })}
                </div>
              )}

              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <CartesianGrid stroke="#1F3328" strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#4D7060' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#4D7060' }} />
                  <Tooltip
                    contentStyle={{ background: '#121E15', border: '1px solid #1F3328', borderRadius: 8 }}
                    labelStyle={{ color: '#E8F4ED', fontSize: 11 }}
                    itemStyle={{ fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {allMetrics
                    .filter(key => selectedMetrics.has(key))
                    .map(key => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={metricColor[key]}
                        dot={false}
                        strokeWidth={1.5}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sensor utilities ──────────────────────────────────────────────────────

/**
 * Devuelve el icono Lucide y el color CSS adecuados para una metrica de sensor.
 * El color de bateria varia segun el nivel: verde >=50%, ambar >=20%, rojo <20%.
 * @param {string} nombre - Nombre de la metrica.
 * @param {number|null} valor - Valor actual (solo usado para bateria).
 * @returns {{ Icon: React.ElementType, color: string }}
 */
function getIconoMetrica(nombre, valor) {
  const n = nombre ?? '';
  if (/bater[ií]a/i.test(n)) {
    const color = valor == null ? '#6B7280'
                : valor >= 50  ? '#22C55E'
                : valor >= 20  ? '#F59E0B'
                :                '#EF4444';
    return { Icon: Battery, color };
  }
  if (/panel solar/i.test(n))                    return { Icon: Sun,        color: '#EAB308' };
  if (/temperatura suelo/i.test(n))              return { Icon: Thermometer, color: '#F97316' };
  if (/temperatura/i.test(n))                    return { Icon: Thermometer, color: '#EF4444' };
  if (/humedad suelo/i.test(n))                  return { Icon: Droplets,   color: '#3B82F6' };
  if (/humedad relativa/i.test(n))               return { Icon: Droplets,   color: '#60A5FA' };
  if (/precipitac/i.test(n))                     return { Icon: CloudRain,  color: '#1E3A8A' };
  if (/radiaci[oó]n solar/i.test(n))             return { Icon: Sun,        color: '#F59E0B' };
  if (/velocidad viento|direcci[oó]n viento/i.test(n)) return { Icon: Wind, color: '#7DD3FC' };
  if (/humect.*foliar/i.test(n))                 return { Icon: Leaf,       color: '#22C55E' };
  if (/presi[oó]n/i.test(n))                     return { Icon: Gauge,      color: '#64748B' };
  return { Icon: Activity, color: '#6B7280' };
}

// ── Sub-components ────────────────────────────────────────────────────────

/**
 * Tarjeta de metrica en vivo con icono coloreado, valor grande y unidad.
 * @component
 * @param {Object} props
 * @param {Object} props.metrica - Objeto metrica con nombre, valor, unidad, decimals.
 * @returns {JSX.Element}
 */
function MetricaCard({ metrica }) {
  const { Icon, color } = getIconoMetrica(metrica.nombre, metrica.valor);
  const decimals = Math.min(metrica.decimals ?? 2, 1);

  return (
    <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex flex-col min-h-[130px]">
      <div className="mb-2">
        <Icon size={28} style={{ color }} />
      </div>
      <div className="flex-1 flex items-end">
        <div className="leading-none">
          <span className="text-[2rem] font-bold font-mono text-text leading-none">
            {metrica.valor.toFixed(decimals)}
          </span>
          {metrica.unidad && (
            <span className="text-sm text-text-muted ml-1">{metrica.unidad}</span>
          )}
        </div>
      </div>
      <div className="text-[11px] text-text-subtle truncate mt-2">
        {metrica.nombre}
      </div>
    </div>
  );
}

/**
 * Tabla desplegable de metricas de detalle tecnico con canal, valor y unidad.
 * @component
 * @param {Object} props
 * @param {Array} props.metricas - Array de metricas de detalle del servidor.
 * @returns {JSX.Element}
 */
function DetallePanel({ metricas }) {
  if (!Array.isArray(metricas) || metricas.length === 0)
    return <p className="text-text-muted text-xs p-4">Sin datos de detalle.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="border-b border-border text-text-subtle">
            <th className="py-2 px-3 font-medium">Sensor</th>
            <th className="py-2 px-3 font-medium">Canal</th>
            <th className="py-2 px-3 font-medium text-right">Valor</th>
            <th className="py-2 px-3 font-medium">Unidad</th>
          </tr>
        </thead>
        <tbody>
          {metricas.map((m, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-card-hover transition-colors">
              <td className="py-1.5 px-3 text-text-subtle font-mono">{m.nombreOriginal}</td>
              <td className="py-1.5 px-3 text-text-muted">{m.canal != null ? `ch${m.canal}` : '—'}</td>
              <td className="py-1.5 px-3 text-text font-mono text-right">
                {m.valor !== null && m.valor !== undefined
                  ? m.valor.toFixed(Math.min(m.decimals ?? 2, 2))
                  : '—'}
              </td>
              <td className="py-1.5 px-3 text-text-muted">{m.unidad || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Grid de tarjetas de datos en vivo con panel de detalle tecnico expandible.
 * @component
 * @param {Object} props
 * @param {Object|null} props.data - Datos del servidor con arrays principal y detalle.
 * @param {string} props.source - Fuente de datos ('fieldclimate'|'cesens').
 * @returns {JSX.Element}
 */
function LiveDataGrid({ data, source }) {
  const [detalleAbierto, setDetalleAbierto] = useState(false);

  if (!data) return <div className="card p-6 text-center text-text-muted text-sm">Sin datos</div>;

  if (Array.isArray(data?.principal)) {
    const visibles = data.principal.filter(m => m.valor !== null && m.valor !== undefined);

    if (visibles.length === 0)
      return <div className="card p-6 text-center text-text-muted text-sm">Sin lecturas en las últimas 48 horas</div>;

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {visibles.map((m, i) => (
            <MetricaCard key={i} metrica={m} />
          ))}
        </div>

        {Array.isArray(data.detalle) && data.detalle.length > 0 && (
          <div className="card overflow-hidden">
            <button
              onClick={() => setDetalleAbierto(o => !o)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-text-subtle hover:text-text hover:bg-card-hover transition-colors"
            >
              <span>Ver detalle técnico</span>
              {detalleAbierto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {detalleAbierto && <DetallePanel metricas={data.detalle} />}
          </div>
        )}
      </div>
    );
  }

  return <div className="card p-6 text-center text-text-muted text-sm">Formato de datos no reconocido</div>;
}

// ── FieldClimate chart helpers ─────────────────────────────────────────────

const FC_TRADUCCIONES = {
  'Air Temperature':            'Temperatura Aire',
  'Relative Humidity':          'Humedad Relativa',
  'Solar Radiation':            'Radiación Solar',
  'Precipitation':              'Precipitación',
  'Leaf Wetness':               'Humectación Foliar',
  'Wind Speed':                 'Velocidad Viento',
  'Wind Direction':             'Dirección Viento',
  'Battery':                    'Batería',
  'Solar Panel':                'Panel Solar',
  'EnviroPro Soil Moisture':    'Humedad Suelo',
  'EnviroPro Soil Temperature': 'Temperatura Suelo',
};

const FC_PRINCIPAL_RE = [
  /^air temperature/i,
  /^relative humidity/i,
  /^solar radiation/i,
  /^precipitation/i,
  /^leaf wetness/i,
  /^wind speed/i,
  /^battery/i,
  /soil temperature/i,
  /soil moisture/i,
];

/**
 * Traduce el nombre original de un sensor FC al equivalente en espanol.
 * Soporta nombres con sufijo numerico (ej. "Air Temperature 2").
 * @param {string} original - Nombre en ingles del sensor.
 * @returns {string}
 */
function traducirFC(original) {
  if (!original) return original;
  if (FC_TRADUCCIONES[original]) return FC_TRADUCCIONES[original];
  const m = original.match(/^(.+?)\s+(\d+)$/);
  if (m && FC_TRADUCCIONES[m[1]]) return `${FC_TRADUCCIONES[m[1]]} ${m[2]}`;
  return original;
}

/**
 * Extrae el nombre original de un sensor FC normalizando el campo name.
 * @param {Object} s - Objeto sensor.
 * @returns {string}
 */
function fcNombreOrig(s) {
  if (s.name_original) return s.name_original;
  if (typeof s.name === 'object' && s.name !== null && s.name.original) return s.name.original;
  if (typeof s.name === 'string' && s.name) return s.name;
  return '';
}

/**
 * Extrae el nombre personalizado de un sensor FC; null si no existe.
 * @param {Object} s - Objeto sensor.
 * @returns {string|null}
 */
function fcNombreCustom(s) {
  return (typeof s.name === 'object' && s.name !== null) ? (s.name.custom ?? null) : null;
}

/**
 * Convierte un timestamp FC (Unix segundos o cadena ISO) a Date.
 * @param {number|string|null} ts - Timestamp de origen.
 * @returns {Date|null}
 */
function fcTsToDate(ts) {
  if (ts == null) return null;
  const n = Number(ts);
  if (!isNaN(n) && n > 1e9) return new Date(n * 1000);
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Transforma el historico raw de FC en un array de puntos para Recharts.
 * Filtra sensores no numericos y aplica traducciones. Limita a los ultimos 288 puntos.
 * @param {Object} histData - Objeto con arrays dates y data del API FC.
 * @returns {Array<Object>} Puntos con campo fecha y una entrada por metrica.
 */
function parseFCChart(histData) {
  const fechas   = Array.isArray(histData?.dates) ? histData.dates : [];
  const sensores = Array.isArray(histData?.data)  ? histData.data  : [];
  if (fechas.length === 0 || sensores.length === 0) return [];

  const aggrPref = ['avg', 'last', 'min', 'max'];

  const preprocesados = sensores
    .map(s => {
      const nombreOrig = fcNombreOrig(s);
      const nombreCustom = fcNombreCustom(s);
      const label = traducirFC(nombreCustom ?? nombreOrig) || `Sensor ${s.code ?? '?'}`;
      const aggr  = aggrPref.find(a => Array.isArray(s.values?.[a])) ?? Object.keys(s.values ?? {})[0];
      const vals  = Array.isArray(s.values?.[aggr]) ? s.values[aggr] : [];
      return { nombreOrig, label, vals };
    })
    .filter(({ nombreOrig }) => {
      if (/serial.?number/i.test(nombreOrig)) return false;
      return FC_PRINCIPAL_RE.some(re => re.test(nombreOrig));
    });

  const grafica = preprocesados.length > 0
    ? preprocesados
    : sensores.map(s => {
        const nombreOrig  = fcNombreOrig(s);
        const nombreCustom = fcNombreCustom(s);
        const label = traducirFC(nombreCustom ?? nombreOrig) || `Sensor ${s.code ?? '?'}`;
        const aggr  = aggrPref.find(a => Array.isArray(s.values?.[a])) ?? Object.keys(s.values ?? {})[0];
        const vals  = Array.isArray(s.values?.[aggr]) ? s.values[aggr] : [];
        return { nombreOrig, label, vals };
      });

  return fechas
    .map((ts, i) => {
      const d = fcTsToDate(ts);
      const punto = {};
      grafica.forEach(({ label, vals }) => {
        const v = vals[i];
        if (v !== null && v !== undefined) punto[label] = v;
      });
      if (Object.keys(punto).length === 0) return null;
      punto.fecha = d ? format(d, 'dd/MM HH:mm') : '—';
      return punto;
    })
    .filter(Boolean)
    .slice(-288);
}

// ── Cesens chart helper ────────────────────────────────────────────────────

/**
 * Transforma el historico raw de Cesens en puntos para Recharts agrupados por timestamp.
 * Limita a los ultimos 200 puntos ordenados cronologicamente.
 * @param {Array} histData - Array de metricas con sus datos del API Cesens.
 * @returns {Array<Object>} Puntos con campo fecha y una entrada por metrica.
 */
function parseCesensChart(histData) {
  if (!Array.isArray(histData)) return [];
  const byTs = {};
  histData.forEach((metrica) => {
    if (!Array.isArray(metrica.datos)) return;
    const label = metrica.nombre ?? `M${metrica.idMetrica}`;
    metrica.datos.forEach((point) => {
      const tsRaw = point.ts ?? point.fecha ?? point.timestamp;
      if (tsRaw == null) return;
      const tsNum = Number(tsRaw);
      const key = isNaN(tsNum) ? String(tsRaw) : tsNum;
      if (!byTs[key]) byTs[key] = { _ts: isNaN(tsNum) ? 0 : tsNum };
      byTs[key][label] = point.valor ?? point.value;
    });
  });
  return Object.values(byTs)
    .sort((a, b) => a._ts - b._ts)
    .slice(-200)
    .map(({ _ts, ...rest }) => ({
      ...rest,
      fecha: _ts ? format(new Date(_ts * 1000), 'dd/MM HH:mm') : '—',
    }));
}
