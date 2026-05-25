import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Trash2, X, Loader2,
  Settings, SlidersHorizontal, ChevronDown, Radio, Zap, Eraser, Mail,
} from 'lucide-react';
import { alertsApi } from '@features/alerts/api/alerts.api';
import { stationsApi } from '@features/stations/api/stations.api';
import { adminApi } from '@features/admin/api/admin.api';
import { useAuthStore } from '@shared/store/authStore';
import Pagination from '@shared/components/common/Pagination';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

// ── Helpers ─────────────────────────────────────────────────────────────────

const TABS = ['all', 'active', 'resolved'];

const OPERATORS = [
  { value: 'gt', label: 'Mayor que', symbol: '>' },
  { value: 'lt', label: 'Menor que', symbol: '<' },
  { value: 'eq', label: 'Igual a',   symbol: '=' },
];

function getStationId(st) {
  return st.source === 'fieldclimate'
    ? (st.name?.original ?? st._id)
    : String(st.id ?? st.id_ubicacion);
}

function getStationName(st) {
  return st.source === 'fieldclimate'
    ? (st.name?.custom ?? st.name?.original ?? 'Estación FC')
    : (st.nombre ?? st.ubicacion ?? `Cesens #${st.id}`);
}

// ── Styled select ────────────────────────────────────────────────────────────

/**
 * Select estilizado con flecha personalizada.
 * @component
 * @param {Object} props
 * @param {string} [props.label] - Etiqueta del campo.
 * @param {string} props.value - Valor seleccionado.
 * @param {Function} props.onChange - Callback de cambio.
 * @param {boolean} [props.disabled] - Si el select esta deshabilitado.
 * @param {React.ReactNode} props.children - Opciones del select.
 * @returns {JSX.Element}
 */
function Select({ label, value, onChange, disabled, children }) {
  return (
    <div>
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <select
          className="input appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          value={value}
          onChange={onChange}
          disabled={disabled}
        >
          {children}
        </select>
        <ChevronDown
          size={13}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none"
        />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

/**
 * Pagina de alertas con dos vistas: listado de alertas (con tabs) y configuracion de umbrales.
 * Superadmin tiene acceso a acciones extra: comprobar alertas ahora y enviar email demo.
 * @component
 * @returns {JSX.Element}
 */
export default function AlertsPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'superadmin';

  const [tab, setTab] = useState('active');
  const [view, setView] = useState('alerts'); // 'alerts' | 'config'
  const [modalOpen, setModalOpen] = useState(false);
  const [runToast, setRunToast] = useState(null);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const qc = useQueryClient();

  useEffect(() => {
    if (!runToast) return;
    const t = setTimeout(() => setRunToast(null), 5000);
    return () => clearTimeout(t);
  }, [runToast]);

  const { data, isLoading } = useQuery({
    queryKey: ['alerts', tab, page, pageSize],
    queryFn: () =>
      alertsApi.getAlerts({ ...(tab !== 'all' && { status: tab }), page, limit: pageSize })
        .then((r) => r.data.data),
    staleTime: 20_000,
    keepPreviousData: true,
  });

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['alert-configs'],
    queryFn: () => alertsApi.getConfigs().then((r) => r.data.data.configs ?? []),
    staleTime: 60_000,
    enabled: view === 'config',
  });

  const runNowMut = useMutation({
    mutationFn: () => adminApi.runAlertsNow(),
    onSuccess: (res) => {
      const result = res.data.data;
      setRunToast(result);
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const demoAlertMut = useMutation({
    mutationFn: () => adminApi.demoAlertEmail(),
    onSuccess: () => setRunToast({ alertasGeneradas: 0, demo: true }),
  });

  const resolveMut = useMutation({
    mutationFn: (id) => alertsApi.resolveAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const deleteAlertMut = useMutation({
    mutationFn: (id) => alertsApi.deleteAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  });

  const deleteResolvedAllMut = useMutation({
    mutationFn: () => alertsApi.deleteResolvedAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      setClearConfirm(false);
    },
  });

  const deleteConfigMut = useMutation({
    mutationFn: (id) => alertsApi.deleteConfig(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alert-configs'] }),
  });

  const alerts = data?.alertas ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">{t('alerts.title')}</h1>
          <p className="page-subtitle">{data?.total ?? '—'} total</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* View toggle */}
          <div className="flex bg-surface border border-border rounded-lg p-0.5">
            <button
              onClick={() => setView('alerts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                view === 'alerts'
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <AlertTriangle size={13} />
              Alertas
            </button>
            <button
              onClick={() => setView('config')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${
                view === 'config'
                  ? 'bg-primary/15 text-primary'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              <Settings size={13} />
              Umbrales
            </button>
          </div>

          {isAdmin && (
            <>
              <button
                onClick={() => runNowMut.mutate()}
                disabled={runNowMut.isPending}
                className="btn-ghost flex items-center gap-2 text-sm border border-warn/30 text-warn hover:bg-warn/10 disabled:opacity-50"
                title="Ejecutar comprobación de alertas ahora"
              >
                {runNowMut.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Zap size={14} />}
                Comprobar ahora
              </button>
              <button
                onClick={() => demoAlertMut.mutate()}
                disabled={demoAlertMut.isPending}
                className="btn-ghost flex items-center gap-2 text-sm border border-danger/30 text-danger hover:bg-danger/10 disabled:opacity-50"
                title="Enviar email de alerta crítica demo al superadmin"
              >
                {demoAlertMut.isPending
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Mail size={14} />}
                Demo alerta
              </button>
            </>
          )}

          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <SlidersHorizontal size={14} />
            Configurar Umbral
          </button>
        </div>
      </div>

      {/* Toast resultado run-now */}
      <AnimatePresence>
        {runToast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-sm font-medium ${
              runToast.demo
                ? 'bg-info/10 border-info/30 text-info'
                : runToast.alertasGeneradas > 0
                ? 'bg-warn/10 border-warn/30 text-warn'
                : 'bg-success/10 border-success/30 text-success'
            }`}
          >
            {runToast.demo
              ? <><Mail size={15} /> Email de alerta demo enviado a tu bandeja de entrada.</>
              : runToast.alertasGeneradas > 0
              ? <><Zap size={15} /> {runToast.alertasGeneradas} alerta{runToast.alertasGeneradas > 1 ? 's' : ''} nueva{runToast.alertasGeneradas > 1 ? 's' : ''} generada{runToast.alertasGeneradas > 1 ? 's' : ''}.</>
              : <><CheckCircle2 size={15} /> Todo en orden — ningún umbral superado.</>}
            <button onClick={() => setRunToast(null)} className="ml-auto opacity-60 hover:opacity-100">
              <X size={13} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {view === 'alerts' ? (
          <motion.div key="alerts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div className="flex gap-1 bg-surface border border-border rounded-lg p-1 w-fit">
                {TABS.map((t_) => (
                  <button
                    key={t_}
                    onClick={() => { setTab(t_); setClearConfirm(false); setPage(1); }}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                      tab === t_ ? 'bg-primary/15 text-primary' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    {t(`alerts.${t_}`)}
                  </button>
                ))}
              </div>

              {tab === 'resolved' && alerts.length > 0 && !clearConfirm && (
                <button
                  onClick={() => setClearConfirm(true)}
                  className="btn-ghost flex items-center gap-1.5 text-xs text-danger hover:bg-danger/10 border border-danger/20"
                >
                  <Eraser size={12} />
                  Limpiar resueltas
                </button>
              )}

              {tab === 'resolved' && clearConfirm && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 bg-danger/10 border border-danger/30 rounded-lg px-3 py-1.5 text-xs"
                >
                  <span className="text-danger font-medium">¿Eliminar todas las resueltas?</span>
                  <button
                    onClick={() => deleteResolvedAllMut.mutate()}
                    disabled={deleteResolvedAllMut.isPending}
                    className="btn-ghost px-2 py-0.5 text-danger hover:bg-danger/20 font-semibold"
                  >
                    {deleteResolvedAllMut.isPending ? <Loader2 size={11} className="animate-spin" /> : 'Sí, eliminar'}
                  </button>
                  <button
                    onClick={() => setClearConfirm(false)}
                    className="btn-ghost px-2 py-0.5 text-text-muted hover:text-text"
                  >
                    Cancelar
                  </button>
                </motion.div>
              )}
            </div>

            {isLoading ? (
              <div className="card p-8 text-center text-text-muted text-sm">{t('common.loading')}</div>
            ) : alerts.length === 0 ? (
              <div className="card p-10 text-center space-y-2">
                <CheckCircle2 size={32} className="text-success mx-auto" />
                <p className="text-text font-medium">{t('alerts.noAlerts')}</p>
              </div>
            ) : (
              <>
                <div className="card divide-y divide-border overflow-hidden">
                  {alerts.map((alert) => (
                    <AlertRow
                      key={alert._id}
                      alert={alert}
                      onResolve={() => resolveMut.mutate(alert._id)}
                      resolving={resolveMut.isPending && resolveMut.variables === alert._id}
                      onDelete={() => deleteAlertMut.mutate(alert._id)}
                      deleting={deleteAlertMut.isPending && deleteAlertMut.variables === alert._id}
                    />
                  ))}
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </motion.div>
        ) : (
          <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {configLoading ? (
              <div className="card p-8 text-center text-text-muted text-sm">{t('common.loading')}</div>
            ) : (configData ?? []).length === 0 ? (
              <div className="card p-10 text-center space-y-3">
                <SlidersHorizontal size={32} className="text-text-subtle mx-auto" />
                <p className="text-text-muted text-sm">Sin umbrales configurados</p>
                <button onClick={() => setModalOpen(true)} className="btn-primary text-sm mx-auto flex items-center gap-2">
                  <SlidersHorizontal size={13} />
                  Configurar primer umbral
                </button>
              </div>
            ) : (
              <div className="card divide-y divide-border overflow-hidden">
                {(configData ?? []).map((cfg) => (
                  <ConfigRow
                    key={cfg._id}
                    config={cfg}
                    onDelete={() => deleteConfigMut.mutate(cfg._id)}
                    deleting={deleteConfigMut.isPending && deleteConfigMut.variables === cfg._id}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal */}
      <ConfigModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={() => {
          qc.invalidateQueries({ queryKey: ['alert-configs'] });
          setView('config');
        }}
      />
    </div>
  );
}

// ── Alert row ────────────────────────────────────────────────────────────────

/**
 * Fila de alerta con datos de estacion, metrica y valor; acciones de resolver y eliminar.
 * @component
 * @param {Object} props
 * @param {Object} props.alert - Objeto alerta del servidor.
 * @param {Function} props.onResolve - Callback para marcar como resuelta.
 * @param {boolean} props.resolving - Si la mutacion de resolucion esta en curso.
 * @param {Function} props.onDelete - Callback para eliminar la alerta.
 * @param {boolean} props.deleting - Si la mutacion de eliminacion esta en curso.
 * @returns {JSX.Element}
 */
function AlertRow({ alert, onResolve, resolving, onDelete, deleting }) {
  const { t } = useTranslation();
  const resolved = alert.status === 'resolved';
  return (
    <div className={`flex items-start gap-4 px-4 py-4 hover:bg-card-hover transition-colors ${resolved ? 'opacity-60' : ''}`}>
      <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${alert.type === 'critical' ? 'bg-danger' : 'bg-warn'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-text text-sm font-medium">{alert.message}</p>
          <span className={`badge shrink-0 ${alert.type === 'critical' ? 'badge-danger' : 'badge-warn'}`}>
            {t(`alerts.${alert.type}`)}
          </span>
        </div>
        <div className="mt-1.5 flex items-center gap-3 text-xs text-text-muted flex-wrap">
          <span>{t('alerts.station')}: <span className="text-text font-mono">{alert.stationId}</span></span>
          <span>{t('alerts.metric')}: <span className="text-text">{alert.metric}</span></span>
          <span>{t('alerts.value')}: <span className="text-primary font-mono">{alert.value}</span></span>
          <span>{t('alerts.threshold')}: <span className="text-text font-mono">{alert.threshold}</span></span>
          <span className="text-text-subtle">
            {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true, locale: es })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!resolved && (
          <button
            onClick={onResolve}
            disabled={resolving}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-2.5"
          >
            {resolving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
            {t('alerts.resolve')}
          </button>
        )}
        {resolved && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="btn-ghost p-1.5 text-danger hover:bg-danger/10 disabled:opacity-50"
            title="Eliminar alerta"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Config row ───────────────────────────────────────────────────────────────

/**
 * Fila de configuracion de umbral con fuente, estacion, metrica, operador y valor limite.
 * @component
 * @param {Object} props
 * @param {Object} props.config - Objeto de configuracion de umbral.
 * @param {Function} props.onDelete - Callback para eliminar la config.
 * @param {boolean} props.deleting - Si la mutacion de eliminacion esta en curso.
 * @returns {JSX.Element}
 */
function ConfigRow({ config, onDelete, deleting }) {
  const operator = OPERATORS.find((o) => o.value === config.operator);

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-card-hover transition-colors">
      <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
        <div className="text-text-muted">
          Fuente <span className={`ml-1 badge ${config.source === 'fieldclimate' ? 'badge-info' : 'badge-green'}`}>
            {config.source === 'fieldclimate' ? 'FC' : 'CS'}
          </span>
        </div>
        <span className="text-text-muted">Estación: <span className="text-text font-mono text-[10px]">{config.stationId}</span></span>
        <span className="text-text-muted">Métrica: <span className="text-text">{config.metric}</span></span>
        <span className="text-text-muted">Operador: <span className="text-text font-mono">{operator?.symbol ?? config.operator}</span></span>
        <span className="text-text-muted">Umbral: <span className="text-primary font-mono font-semibold">{config.threshold}</span></span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`badge ${config.active ? 'badge-green' : 'badge-muted'}`}>
          {config.active ? 'Activo' : 'Inactivo'}
        </span>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="btn-ghost p-1.5 text-danger hover:bg-danger/10 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  source: 'fieldclimate',
  stationId: '',
  metric: '',
  operator: 'gt',
  threshold: '',
};

/**
 * Modal de creacion de umbral de alerta. Carga estaciones y metricas dinamicamente
 * segun la fuente seleccionada. Resetea campos dependientes al cambiar fuente/estacion.
 * @component
 * @param {Object} props
 * @param {boolean} props.open - Visibilidad del modal.
 * @param {Function} props.onClose - Callback al cerrar.
 * @param {Function} [props.onSave] - Callback tras guardar exitosamente.
 * @returns {JSX.Element|null}
 */
function ConfigModal({ open, onClose, onSave }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [thresholdError, setThresholdError] = useState('');

  const set = (k) => (e) => {
    const val = e.target ? e.target.value : e;
    setForm((p) => ({
      ...p,
      [k]: val,
      ...(k === 'source'    ? { stationId: '', metric: '' } : {}),
      ...(k === 'stationId' ? { metric: '' }                : {}),
    }));
    if (k === 'threshold') {
      const n = parseFloat(val);
      if (val === '' || isNaN(n) || n <= 0) {
        setThresholdError(t('validation.thresholdPositive'));
      } else {
        setThresholdError('');
      }
    }
  };

  const { data: rawStations, isLoading: stLoading } = useQuery({
    queryKey: ['stations-for-alert', form.source],
    queryFn: () =>
      form.source === 'fieldclimate'
        ? stationsApi.getFCStations().then((r) => r.data.data.estaciones ?? [])
        : stationsApi.getCesensStations().then((r) => r.data.data.estaciones ?? []),
    enabled: open,
    staleTime: 120_000,
  });

  const stations = (rawStations ?? []).map((st) => ({
    id: getStationId(st),
    name: getStationName(st),
  }));

  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['station-metrics', form.source, form.stationId],
    queryFn: () => stationsApi.getMetrics(form.source, form.stationId)
      .then((r) => r.data.data.metricas ?? []),
    enabled: open && !!form.stationId,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (metricsData?.length > 0 && !form.metric) {
      setForm((p) => ({ ...p, metric: metricsData[0].id }));
    }
  }, [metricsData]);

  const createMut = useMutation({
    mutationFn: (data) => alertsApi.createConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alert-configs'] });
      setForm(DEFAULT_FORM);
      onClose();
      onSave?.();
    },
  });

  const selectedMetric = (metricsData ?? []).find((m) => m.id === form.metric);
  const thresholdNum = parseFloat(form.threshold);
  const thresholdValid = form.threshold !== '' && !isNaN(thresholdNum) && thresholdNum > 0;
  const canSubmit = form.stationId && form.metric && form.operator && thresholdValid && !thresholdError;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-bg/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative card w-full max-w-md z-10 overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <SlidersHorizontal size={15} className="text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-semibold text-text text-sm">Configurar Umbral</h3>
              <p className="text-text-subtle text-xs">Crea una alerta automática</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="label">Fuente de datos</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'fieldclimate', label: 'FieldClimate', color: 'badge-info' },
                { value: 'cesens',       label: 'Cesens',       color: 'badge-green' },
              ].map((src) => (
                <button
                  key={src.value}
                  type="button"
                  onClick={() => set('source')(src.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                    form.source === src.value
                      ? 'border-primary/40 bg-primary/8 text-primary'
                      : 'border-border text-text-muted hover:border-border-focus hover:text-text bg-transparent'
                  }`}
                >
                  <Radio size={14} className={form.source === src.value ? 'text-primary' : 'text-text-subtle'} />
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Estación</label>
            <div className="relative">
              {stLoading ? (
                <div className="input flex items-center gap-2 text-text-muted text-sm">
                  <Loader2 size={13} className="animate-spin" />
                  Cargando estaciones...
                </div>
              ) : (
                <>
                  <select
                    className="input appearance-none pr-8 cursor-pointer"
                    value={form.stationId}
                    onChange={set('stationId')}
                  >
                    <option value="">— Selecciona una estación —</option>
                    {stations.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.id})
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none" />
                </>
              )}
            </div>
            {!stLoading && stations.length === 0 && (
              <p className="text-xs text-text-subtle mt-1">Sin estaciones disponibles para esta fuente</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">
                Métrica
                {metricsLoading && <Loader2 size={11} className="inline ml-1.5 animate-spin text-text-subtle" />}
              </label>
              <div className="relative">
                <select
                  className="input appearance-none pr-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  value={form.metric}
                  onChange={set('metric')}
                  disabled={!form.stationId || metricsLoading}
                >
                  {!form.stationId ? (
                    <option value="">— Selecciona estación primero —</option>
                  ) : metricsLoading ? (
                    <option value="">Cargando métricas...</option>
                  ) : (metricsData ?? []).length === 0 ? (
                    <option value="">Sin métricas disponibles</option>
                  ) : (
                    <>
                      <option value="">— Selecciona métrica —</option>
                      {(metricsData ?? []).map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}{m.unidad ? ` (${m.unidad})` : ''}
                          {m.valor !== null ? ` · ahora: ${m.valor}` : ''}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="label">
                Umbral
                {selectedMetric?.unidad && <span className="text-text-subtle ml-1">({selectedMetric.unidad})</span>}
              </label>
              <input
                type="number"
                className={`input ${thresholdError ? '!border-danger/60 focus:!border-danger' : (thresholdValid ? '!border-success/50 focus:!border-success' : '')}`}
                value={form.threshold}
                onChange={set('threshold')}
                placeholder={selectedMetric?.valor !== undefined ? String(selectedMetric.valor) : '—'}
                disabled={!form.metric}
              />
              {thresholdError && (
                <p className="text-danger text-xs mt-1">{thresholdError}</p>
              )}
            </div>
          </div>

          <div>
            <label className="label">Condición</label>
            <div className="grid grid-cols-3 gap-2">
              {OPERATORS.map((op) => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => set('operator')(op.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                    form.operator === op.value
                      ? 'border-primary/40 bg-primary/8 text-primary'
                      : 'border-border text-text-muted hover:border-border-focus hover:text-text'
                  }`}
                >
                  <span className="font-mono text-base font-bold">{op.symbol}</span>
                  <span>{op.label}</span>
                </button>
              ))}
            </div>
          </div>

          {form.stationId && form.metric && form.threshold !== '' && (
            <div className="bg-surface border border-border rounded-lg px-3 py-2 text-xs text-text-muted">
              Alerta cuando{' '}
              <span className="text-text font-medium">{selectedMetric?.nombre ?? form.metric}</span>{' '}
              {OPERATORS.find((o) => o.value === form.operator)?.label.toLowerCase()}{' '}
              <span className="text-primary font-mono font-semibold">
                {form.threshold}{selectedMetric?.unidad ? ` ${selectedMetric.unidad}` : ''}
              </span>{' '}
              en <span className="text-text font-mono text-[10px]">{form.stationId}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end px-5 py-4 border-t border-border bg-surface/50">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button
            onClick={() => createMut.mutate({ ...form, threshold: Number(form.threshold) })}
            disabled={createMut.isPending || !canSubmit}
            className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMut.isPending && <Loader2 size={13} className="animate-spin" />}
            Guardar umbral
          </button>
        </div>

        {createMut.isError && (
          <div className="px-5 pb-4 text-xs text-danger">
            {createMut.error?.response?.data?.message ?? 'Error al crear el umbral'}
          </div>
        )}
      </motion.div>
    </div>
  );
}
