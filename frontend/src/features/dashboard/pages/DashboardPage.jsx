import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Link, useNavigate } from 'react-router-dom';
import {
  Radio, AlertTriangle, Wifi, RefreshCw,
  Thermometer, Droplets, Wind, Battery, ArrowRight,
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning,
  Gauge, Activity,
} from 'lucide-react';
import { stationsApi } from '@features/stations/api/stations.api';
import { alertsApi } from '@features/alerts/api/alerts.api';
import { weatherApi } from '@features/dashboard/api/weather.api';
import { useUiStore } from '@shared/store/uiStore';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getStationId, getStationName, metaValores } from '@shared/lib/estaciones.helpers';

// --- Map icons ---
/**
 * Crea un icono de marcador Leaflet como div circular coloreado.
 * @param {string} color - Color CSS del marcador.
 * @returns {L.DivIcon}
 */
function makeIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:${color};border:2px solid rgba(0,0,0,0.45);border-radius:50%;box-shadow:0 0 8px ${color}99;cursor:pointer"></div>`,
    iconAnchor: [7, 7],
  });
}

const STATUS_COLORS = { online: '#22c55e', delayed: '#f59e0b', offline: '#ef4444' };

/**
 * Determina el estado de conexion de una estacion normalizando campos de distintas fuentes.
 * @param {Object} station - Objeto estacion.
 * @returns {'online'|'delayed'|'offline'}
 */
function getConnectionStatus(station) {
  const s = station.status ?? station.estado ?? station.conexion ?? '';
  const sl = String(s).toLowerCase();
  if (/delay|retras|lent/i.test(sl)) return 'delayed';
  if (/offline|inactiv|disconn|error/i.test(sl)) return 'offline';
  return 'online';
}

/**
 * Selecciona el icono del marcador segun alertas activas o estado de conexion.
 * @param {Object} station - Objeto estacion.
 * @param {boolean} hasAlerts - Si la estacion tiene alertas activas.
 * @returns {L.DivIcon}
 */
function pickIcon(station, hasAlerts) {
  if (hasAlerts) return makeIcon('#f97316');
  return makeIcon(STATUS_COLORS[getConnectionStatus(station)]);
}

// --- Station helpers ---
/**
 * Extrae coordenadas [lat, lon] de una estacion normalizando campos de FC y Cesens.
 * @param {Object} station - Objeto estacion.
 * @returns {[number, number]|null} Par de coordenadas o null si no disponibles.
 */
function getCoords(station) {
  if (station._storedLat != null && station._storedLon != null) {
    return [station._storedLat, station._storedLon];
  }
  if (station.source === 'fieldclimate') {
    const geo = station.info?.geo ?? station.geo ?? {};
    const lat = geo.lat ?? geo.latitude ?? station.lat;
    const lon = geo.lon ?? geo.lng ?? geo.longitude ?? station.lon ?? station.lng;
    if (lat != null && lon != null) {
      const la = parseFloat(lat);
      const lo = parseFloat(lon);
      if (!isNaN(la) && !isNaN(lo)) return [la, lo];
    }
  }
  if (station.source === 'cesens') {
    const { latitud, longitud } = station;
    if (latitud != null && longitud != null) return [parseFloat(latitud), parseFloat(longitud)];
  }
  return null;
}

// --- WMO weather code → icon/color ---
/**
 * Devuelve el icono y color para un codigo meteorologico WMO.
 * @param {number} code - Codigo WMO.
 * @returns {{ Icon: React.ElementType, color: string }}
 */
function wmoIcon(code) {
  if (code === 0) return { Icon: Sun, color: 'text-yellow-400' };
  if (code <= 3) return { Icon: Cloud, color: 'text-text-muted' };
  if (code <= 48) return { Icon: Cloud, color: 'text-text-muted' };
  if (code <= 67) return { Icon: CloudRain, color: 'text-info' };
  if (code <= 77) return { Icon: CloudSnow, color: 'text-blue-300' };
  if (code <= 82) return { Icon: CloudRain, color: 'text-info' };
  return { Icon: CloudLightning, color: 'text-warn' };
}

/**
 * Devuelve la etiqueta traducida para un codigo meteorologico WMO.
 * @param {number} code - Codigo WMO.
 * @param {Function} t - Funcion de traduccion.
 * @returns {string}
 */
function wmoLabel(code, t) {
  if (code === 0) return t('weather.clear');
  if (code === 1) return t('weather.mostlyClear');
  if (code === 2) return t('weather.partlyCloudy');
  if (code === 3) return t('weather.overcast');
  if (code <= 48) return t('weather.fog');
  if (code <= 67) return t('weather.rain');
  if (code <= 77) return t('weather.snow');
  if (code <= 82) return t('weather.showers');
  return t('weather.thunderstorm');
}

// --- Animations ---
const staggerChildren = { animate: { transition: { staggerChildren: 0.07 } } };
const fadeUp = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

// --- Map sub-components (must live inside MapContainer) ---
/**
 * Componente Leaflet que ajusta el viewport del mapa para incluir todas las posiciones.
 * Debe montarse dentro de un MapContainer.
 * @component
 * @param {Object} props
 * @param {Array<[number,number]>} props.positions - Array de pares [lat, lon].
 * @returns {null}
 */
function MapFitter({ positions }) {
  const map = useMap();
  const key = JSON.stringify(positions);
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [40, 40], maxZoom: 14 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

/**
 * Marcador de estacion en el mapa con tooltip y navegacion al detalle al hacer click.
 * @component
 * @param {Object} props
 * @param {Object} props.station - Objeto estacion.
 * @param {boolean} props.hasAlerts - Si la estacion tiene alertas activas.
 * @returns {JSX.Element|null}
 */
function StationMarker({ station, hasAlerts }) {
  const navigate = useNavigate();
  const coords = getCoords(station);
  if (!coords) return null;
  const id = getStationId(station);
  const name = getStationName(station);
  const status = getConnectionStatus(station);
  const statusLabel = status === 'online' ? 'Online' : status === 'delayed' ? 'Retrasada' : 'Offline';
  return (
    <Marker
      position={coords}
      icon={pickIcon(station, hasAlerts)}
      eventHandlers={{ click: () => navigate(`/stations/${station.source}/${id}`) }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
        <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', lineHeight: '1.4' }}>
          <strong>{name}</strong>
          <div style={{ color: hasAlerts ? '#f97316' : STATUS_COLORS[status], fontSize: '11px' }}>
            {hasAlerts ? '⚠ Con alertas' : `● ${statusLabel}`}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}

// --- Page ---
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

/**
 * Pagina principal del dashboard con mapa interactivo de estaciones, KPIs,
 * alertas activas recientes, widget meteorologico y grid de tarjetas de estaciones.
 * @component
 * @returns {JSX.Element}
 */
export default function DashboardPage() {
  const { t } = useTranslation();
  const { theme } = useUiStore();

  const { data: stData, isLoading: stLoading, refetch: refetchSt } = useQuery({
    queryKey: ['stations-all'],
    queryFn: () => stationsApi.getAll().then((r) => r.data.data.estaciones ?? []),
    staleTime: 60_000,
  });

  const { data: alertData, isLoading: alLoading } = useQuery({
    queryKey: ['alerts', 'active'],
    queryFn: () => alertsApi.getAlerts({ status: 'active', limit: 5 }).then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: weatherData } = useQuery({
    queryKey: ['weather'],
    queryFn: () => weatherApi.getCurrent().then((r) => r.data.data.prediccion),
    staleTime: 300_000,
  });

  const { data: sensorCountData, isLoading: scLoading } = useQuery({
    queryKey: ['active-sensors'],
    queryFn: () => stationsApi.getActiveSensors().then((r) => r.data.data),
    staleTime: 60_000,
  });

  const stations = stData ?? [];
  const alerts = alertData?.alertas ?? [];
  const activeAlertsCount = alertData?.total ?? 0;

  const mapPositions = useMemo(
    () => stations.map(getCoords).filter(Boolean),
    [stations],
  );

  const stationsWithAlerts = useMemo(
    () => new Set(alerts.map(a => a.stationId)).size,
    [alerts],
  );

  return (
    <motion.div variants={staggerChildren} initial="initial" animate="animate" className="space-y-5">

      {/* KPI row */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard icon={<Radio size={18} />} label={t('dashboard.totalStations')} value={stLoading ? '—' : stations.length} color="primary" />
        <KpiCard icon={<Wifi size={18} />} label={t('dashboard.onlineStations')} value={stLoading ? '—' : stations.filter(s => getConnectionStatus(s) === 'online').length} color="success" />
        <KpiCard icon={<AlertTriangle size={18} />} label={t('dashboard.activeAlerts')} value={alLoading ? '—' : activeAlertsCount} color={activeAlertsCount > 0 ? 'warn' : 'muted'} />
        <KpiCard icon={<Activity size={18} />} label={t('dashboard.activeSensors')} value={scLoading ? '—' : sensorCountData?.total ?? '—'} color="info" />
        <KpiCard icon={<Radio size={18} />} label={t('dashboard.stationsWithAlerts')} value={alLoading ? '—' : stationsWithAlerts} color={stationsWithAlerts > 0 ? 'danger' : 'muted'} />
        <KpiCard icon={<RefreshCw size={18} />} label={t('dashboard.lastUpdate')} value={format(new Date(), 'HH:mm')} color="muted" />
      </motion.div>

      {/* Map + right column */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Map */}
        <motion.div variants={fadeUp} className="xl:col-span-2 card overflow-hidden" style={{ height: 380 }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="font-heading font-semibold text-text text-sm">{t('dashboard.stationMap')}</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-[10px] text-text-muted select-none">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#22c55e' }} />Online
                <span className="w-2.5 h-2.5 rounded-full inline-block ml-1" style={{ background: '#f59e0b' }} />Retrasada
                <span className="w-2.5 h-2.5 rounded-full inline-block ml-1" style={{ background: '#ef4444' }} />Offline
                <span className="w-2.5 h-2.5 rounded-full inline-block ml-1" style={{ background: '#f97316' }} />Alerta
              </div>
              <button onClick={() => refetchSt()} className="btn-ghost p-1.5" aria-label="Refresh">
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
          <MapContainer
            center={[37.9119, -4.7105]}
            zoom={10}
            style={{ height: 'calc(100% - 45px)', width: '100%' }}
            scrollWheelZoom={false}
          >
            <TileLayer
              key={theme}
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url={theme === 'dark' ? TILE_DARK : TILE_LIGHT}
            />
            {mapPositions.length > 0 && <MapFitter positions={mapPositions} />}
            {stations.map((st) => {
              const id = getStationId(st);
              const hasAlerts = alerts.some((a) => a.stationId === id);
              return (
                <StationMarker
                  key={`${st.source}-${id}`}
                  station={st}
                  hasAlerts={hasAlerts}
                />
              );
            })}
          </MapContainer>
        </motion.div>

        {/* Right: Weather + Alerts */}
        <div className="flex flex-col gap-4">
          <motion.div variants={fadeUp}>
            <WeatherWidget data={weatherData} />
          </motion.div>

          <motion.div
            variants={fadeUp}
            whileHover={{ y: -4, boxShadow: '0 12px 32px rgb(var(--c-danger) / 0.12)' }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            className="card flex flex-col flex-1 relative overflow-hidden cursor-default"
            style={{ minHeight: 180 }}
          >
            <div
              className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: 'radial-gradient(circle at 0% 0%, rgb(var(--c-danger) / 0.08) 0%, transparent 65%)' }}
            />
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="font-heading font-semibold text-text text-sm">{t('dashboard.recentAlerts')}</h3>
              <Link to="/alerts" className="text-primary text-xs hover:text-primary-light flex items-center gap-1">
                {t('common.view')} <ArrowRight size={12} />
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto">
              {alLoading ? (
                <div className="flex items-center justify-center h-20 text-text-muted text-sm">{t('common.loading')}</div>
              ) : alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-20 text-text-muted text-sm gap-2">
                  <Wifi size={20} className="text-success" />
                  {t('dashboard.noAlerts')}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {alerts.map((alert) => <AlertRow key={alert._id} alert={alert} />)}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Station cards */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-semibold text-text text-sm">{t('stations.title')}</h3>
          <Link to="/stations" className="text-primary text-xs hover:text-primary-light flex items-center gap-1">
            {t('common.view')} todos <ArrowRight size={12} />
          </Link>
        </div>
        {stLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="card p-4 h-28 animate-pulse bg-card-hover" />)}
          </div>
        ) : stations.length === 0 ? (
          <div className="card p-8 text-center text-text-muted text-sm">{t('dashboard.noStations')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stations.slice(0, 8).map((st) => (
              <StationCard key={`${st.source}-${getStationId(st)}`} station={st} />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// --- Sub-components ---

/**
 * Widget de condicion meteorologica actual con temperatura, icono WMO y viento.
 * @component
 * @param {Object} props
 * @param {Object|null} props.data - Respuesta de la API Open-Meteo.
 * @returns {JSX.Element}
 */
function WeatherWidget({ data }) {
  const { t } = useTranslation();
  const cw = data?.current_weather;
  const temp = cw?.temperature;
  const code = cw?.weathercode ?? 0;
  const wind = cw?.windspeed;
  const { Icon, color } = wmoIcon(code);
  const label = wmoLabel(code, t);

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 12px 32px rgb(var(--c-success) / 0.12)' }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className="card p-4 flex items-center gap-4 relative overflow-hidden cursor-default"
    >
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 0% 0%, rgb(var(--c-success) / 0.1) 0%, transparent 65%)' }}
      />
      <div className={`shrink-0 ${color}`}>
        <Icon size={44} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-text-muted text-xs mb-0.5">Córdoba, ES</div>
        <div className="font-heading font-bold text-3xl text-text leading-none">
          {temp != null ? `${Math.round(temp)}°C` : '—'}
        </div>
        <div className="text-text-subtle text-xs mt-1">{label}</div>
      </div>
      {wind != null && (
        <div className="shrink-0">
          <div className="flex items-center gap-1 text-text-muted text-xs">
            <Wind size={12} />
            <span>{Math.round(wind)} km/h</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const KPI_COLORS = {
  primary: { icon: 'text-primary', bg: 'bg-primary/10', glow: 'rgb(var(--c-primary) / 0.15)' },
  success: { icon: 'text-success', bg: 'bg-success/10', glow: 'rgb(var(--c-success) / 0.15)' },
  warn:    { icon: 'text-warn',    bg: 'bg-warn/10',    glow: 'rgb(var(--c-warn) / 0.15)'    },
  danger:  { icon: 'text-danger',  bg: 'bg-danger/10',  glow: 'rgb(var(--c-danger) / 0.15)'  },
  info:    { icon: 'text-info',    bg: 'bg-info/10',    glow: 'rgb(var(--c-info) / 0.15)'    },
  muted:   { icon: 'text-text-muted', bg: 'bg-surface', glow: 'transparent'                  },
};

/**
 * Tarjeta de KPI con icono, etiqueta y valor numerico grande.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icono Lucide.
 * @param {string} props.label - Texto descriptivo.
 * @param {string|number} props.value - Valor a mostrar.
 * @param {'primary'|'success'|'warn'|'danger'|'info'|'muted'} props.color - Variante de color.
 * @returns {JSX.Element}
 */
function KpiCard({ icon, label, value, color }) {
  const c = KPI_COLORS[color] ?? KPI_COLORS.muted;
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: `0 12px 32px ${c.glow}` }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className="card p-4 flex flex-col gap-3 cursor-default select-none overflow-hidden relative"
    >
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 0% 0%, ${c.glow} 0%, transparent 65%)`, willChange: 'opacity' }}
      />
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.icon} ${c.bg}`}>
          {icon}
        </div>
        <span className="text-text-muted text-[11px] font-medium leading-tight">{label}</span>
      </div>
      <div className="font-heading font-black text-3xl text-text leading-none tracking-tight text-center">
        {value}
      </div>
    </motion.div>
  );
}

/**
 * Fila compacta de alerta activa en el panel del dashboard.
 * @component
 * @param {Object} props
 * @param {Object} props.alert - Objeto alerta.
 * @returns {JSX.Element}
 */
function AlertRow({ alert }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${alert.type === 'critical' ? 'bg-danger' : 'bg-warn'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-text text-xs font-medium truncate">{alert.message}</p>
        <p className="text-text-subtle text-xs mt-0.5">
          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
        </p>
      </div>
    </div>
  );
}

const SLOT_ICONS = {
  thermometer: <Thermometer size={11} />,
  droplets:    <Droplets    size={11} />,
  wind:        <Wind        size={11} />,
  sun:         <Sun         size={11} />,
  battery:     <Battery     size={11} />,
  wifi:        <Wifi        size={11} />,
};

const MotionLink = motion(Link);

/**
 * Tarjeta de estacion en el grid del dashboard con metricas y enlace al detalle.
 * @component
 * @param {Object} props
 * @param {Object} props.station - Objeto estacion.
 * @returns {JSX.Element}
 */
function StationCard({ station }) {
  const id   = getStationId(station);
  const name = getStationName(station);
  const isFC = station.source === 'fieldclimate';
  const { slots, isVisualDevice } = metaValores(station);
  const glow = isFC ? 'rgb(var(--c-info) / 0.12)' : 'rgb(var(--c-success) / 0.12)';
  const glowShadow = isFC ? '0 12px 32px rgb(var(--c-info) / 0.15)' : '0 12px 32px rgb(var(--c-success) / 0.15)';

  const cells = isVisualDevice
    ? slots.map(s => s ?? { icon: null, label: null, value: null, visual: true })
    : slots.filter(Boolean);

  return (
    <MotionLink
      to={`/stations/${station.source}/${id}`}
      whileHover={{ y: -4, boxShadow: glowShadow }}
      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
      className="card p-4 flex flex-col gap-3 relative overflow-hidden select-none"
    >
      <div
        className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `radial-gradient(circle at 0% 0%, ${glow} 0%, transparent 65%)` }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="dot-online" />
          <span className="font-heading font-semibold text-text text-xs truncate">{name}</span>
        </div>
        <span className={`badge text-[10px] ${isFC ? 'badge-info' : 'badge-green'}`}>
          {isFC ? 'FC' : 'CS'}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {cells.map((slot, i) =>
          slot.visual
            ? <span key={i} className="text-[10px] text-text-subtle italic col-span-1">Dispositivo visual</span>
            : <MetricLine key={slot.label} icon={SLOT_ICONS[slot.icon]} label={slot.label} value={slot.value} />
        )}
      </div>
    </MotionLink>
  );
}

/**
 * Linea de metrica compacta con icono, etiqueta y valor alineado a la derecha.
 * @component
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icono de la metrica.
 * @param {string} props.label - Nombre de la metrica.
 * @param {string} props.value - Valor formateado.
 * @returns {JSX.Element}
 */
function MetricLine({ icon, label, value }) {
  return (
    <div className="flex items-center gap-1 text-text-muted text-[11px]">
      <span className="text-text-subtle">{icon}</span>
      <span>{label}:</span>
      <span className="text-text ml-auto font-mono">{value}</span>
    </div>
  );
}
