import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Radio, Search, Thermometer, Droplets, Battery, Wind, Sun, Wifi, ArrowRight } from 'lucide-react';
import { stationsApi } from '@/api/stations';
import { getStationId, getStationName, metaValores } from '@/utils/estaciones.helpers';

export default function StationsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['stations-all'],
    queryFn: () => stationsApi.getAll().then((r) => r.data.data.estaciones ?? []),
    staleTime: 60_000,
  });

  const stations = data ?? [];

  const filtered = stations.filter((st) => {
    const name = getStationName(st).toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const matchFilter = filter === 'all' || st.source === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-5">
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="page-title">{t('stations.title')}</h1>
          <p className="page-subtitle">{filtered.length} estaciones disponibles</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
          <input
            type="text"
            className="input pl-9 text-sm"
            placeholder={t('common.search') + '...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['all', 'fieldclimate', 'cesens'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-primary/15 text-primary border border-primary/30'
                  : 'text-text-muted hover:bg-card hover:text-text border border-transparent'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'fieldclimate' ? 'FieldClimate' : 'Cesens'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 h-36 animate-pulse bg-card-hover" />
          ))}
        </div>
      ) : error ? (
        <div className="card p-8 text-center space-y-2">
          <p className="text-danger">{t('common.error')}</p>
          <button onClick={() => refetch()} className="btn-secondary text-sm">{t('common.retry')}</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-text-muted">{t('common.noResults')}</div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filtered.map((st) => {
            const id   = getStationId(st);
            const name = getStationName(st);
            const isFC = st.source === 'fieldclimate';
            const { slots, isVisualDevice } = metaValores(st);
            const slotIcons = {
              thermometer: <Thermometer size={12} />,
              droplets:    <Droplets    size={12} />,
              wind:        <Wind        size={12} />,
              sun:         <Sun         size={12} />,
              battery:     <Battery     size={12} />,
              wifi:        <Wifi        size={12} />,
            };
            const cells = isVisualDevice
              ? slots.map(s => s ?? { icon: null, label: null, value: null, visual: true })
              : slots.filter(Boolean);
            return (
              <motion.div
                key={`${st.source}-${id}`}
                variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
              >
                <Link
                  to={`/stations/${st.source}/${id}`}
                  className="card-hover p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Radio size={15} className="text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-heading font-semibold text-text text-sm truncate">{name}</div>
                        <div className="text-text-subtle text-xs">{id}</div>
                      </div>
                    </div>
                    <span className={`badge text-[10px] shrink-0 ${isFC ? 'badge-info' : 'badge-green'}`}>
                      {isFC ? 'FieldClimate' : 'Cesens'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {cells.map((slot, i) =>
                      slot.visual
                        ? <span key={i} className="text-[10px] text-text-subtle italic">Dispositivo visual</span>
                        : (
                          <div key={slot.label} className="flex items-center gap-1.5 text-xs text-text-muted">
                            <span className="text-text-subtle">{slotIcons[slot.icon]}</span>
                            <span>{slot.label}:</span>
                            <span className="text-text font-mono ml-auto">{slot.value}</span>
                          </div>
                        )
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="dot-online" />
                      <span className="text-success">{t('stations.online')}</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary">
                      {t('stations.viewDetail')} <ArrowRight size={12} />
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
