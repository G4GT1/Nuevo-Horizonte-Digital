/**
 * Devuelve el identificador unico de una estacion segun su fuente.
 * FieldClimate usa name.original o _id; Cesens usa id o id_ubicacion.
 * @param {Object} station - Objeto estacion de cualquier fuente.
 * @returns {string}
 */
export function getStationId(station) {
  return station.source === 'fieldclimate'
    ? (station.name?.original ?? station._id)
    : String(station.id ?? station.id_ubicacion);
}

/**
 * Devuelve el nombre legible de una estacion segun su fuente.
 * Prioriza nombre personalizado sobre nombre original.
 * @param {Object} station
 * @returns {string}
 */
export function getStationName(station) {
  return station.source === 'fieldclimate'
    ? (station.name?.custom ?? station.name?.original ?? 'Estacion FC')
    : (station.nombre ?? station.ubicacion ?? `Cesens #${station.id}`);
}

/**
 * Promedia un array de valores numericos o convierte un escalar a Number.
 * Devuelve null si la entrada es null/undefined o el array esta vacio.
 * @param {number|number[]|null} v
 * @returns {number|null}
 */
function promediarArray(v) {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const vals = v.filter(x => x != null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  return Number(v);
}

/**
 * Extrae hasta 4 metricas representativas de los metadatos de una estacion
 * y las organiza en slots para mostrar en tarjetas del dashboard y listados.
 * Prioriza: temperatura → humedad → viento/radiacion → bateria/senal.
 * @param {Object} station - Objeto estacion con campo meta.
 * @returns {{ slots: Array<{icon: string, label: string, value: string}|null>, isVisualDevice: boolean }}
 */
export function metaValores(station) {
  const meta   = station?.meta ?? {};
  const isFC   = station?.source === 'fieldclimate';

  const airTemp    = meta.airTemp         != null ? Number(meta.airTemp) : null;
  const soilTemp   = promediarArray(meta.soilTemp);
  const rh         = meta.rh              != null ? Number(meta.rh) : null;
  const soilMoist  = meta.soilMoisture    != null ? Number(meta.soilMoisture)
                   : meta.volumetricAverage != null ? Number(meta.volumetricAverage)
                   : promediarArray(meta.soilMoistureArr);
  const wind       = meta.wind            != null ? Number(meta.wind)
                   : meta.windSpeed       != null ? Number(meta.windSpeed) : null;
  const solarRad   = meta.solarRad        != null ? Number(meta.solarRad)
                   : meta.radiation       != null ? Number(meta.radiation) : null;
  const panelSolar = meta.solarPanel      != null ? Number(meta.solarPanel)
                   : meta.panelSolar      != null ? Number(meta.panelSolar)
                   : meta.solar           != null ? Number(meta.solar) : null;
  const batRaw     = meta.battery      != null ? Number(meta.battery) : null;
  const signal     = meta.signal       != null ? Number(meta.signal) : null;

  const fmt1 = (v, u) => `${v.toFixed(1)} ${u}`;
  const fmt0 = (v, u) => `${Math.round(v)} ${u}`;

  const batPct = batRaw != null
    ? (isFC ? Math.min(100, Math.round((batRaw / 7000) * 100)) : Math.min(100, Math.round(batRaw)))
    : null;

  const slot1 = airTemp != null
    ? { icon: 'thermometer', label: 'Temp',        value: fmt1(airTemp,  '°C') }
    : soilTemp != null
    ? { icon: 'thermometer', label: 'Temp. Suelo', value: fmt1(soilTemp, '°C') }
    : null;

  const slot2 = rh != null
    ? { icon: 'droplets', label: 'Hum',        value: fmt0(rh,        '%') }
    : soilMoist != null
    ? { icon: 'droplets', label: 'Hum. Suelo', value: fmt1(soilMoist, '%') }
    : null;

  const slot3 = wind != null
    ? { icon: 'wind',    label: 'Viento',      value: fmt1(wind,      'm/s')  }
    : solarRad != null
    ? { icon: 'sun',     label: 'Radiación',   value: fmt0(solarRad,  'W/m²') }
    : panelSolar != null
    ? { icon: 'sun',     label: 'Panel Solar', value: fmt0(panelSolar, 'mV')  }
    : null;

  const slot4 = batPct != null
    ? { icon: 'battery', label: 'Batería', value: `${batPct} %` }
    : signal != null
    ? { icon: 'wifi',    label: 'Señal',   value: `${Math.round(signal)} %` }
    : null;

  const isVisualDevice = slot1 === null && slot2 === null && slot3 === null;

  return { slots: [slot1, slot2, slot3, slot4], isVisualDevice };
}

/**
 * Genera una descripcion textual del tipo de estacion a partir de sus metricas.
 * Analiza los nombres de metricas para inferir si es meteorologica,
 * agroclimática, sonda de suelo, etc.
 * @param {Array<{nombre?: string, nombreOriginal?: string, canalesAgregados?: number}>} [principal=[]]
 * @param {Array<{nombre?: string, nombreOriginal?: string}>} [detalle=[]]
 * @returns {string|null} Descripcion o null si no se puede determinar.
 */
export function generarDescripcion(principal = [], detalle = []) {
  const todos = [...principal, ...detalle];

  const matchAny = (re) =>
    todos.some(m => re.test(m.nombre ?? '') || re.test(m.nombreOriginal ?? ''));

  const sueloMulti = principal.find(
    m => (m.canalesAgregados ?? 0) > 1 && /suelo/i.test(m.nombre)
  );
  if (sueloMulti) {
    return `Sonda de suelo multiparamétrica · ${sueloMulti.canalesAgregados} puntos de medición`;
  }

  const tieneTemp    = matchAny(/temperatura aire|air temperature/i);
  const tieneHum     = matchAny(/humedad relativa|relative humidity/i);
  const tieneViento  = matchAny(/velocidad viento|wind speed/i);
  const tieneRad     = matchAny(/radiaci[oó]n solar|solar radiation/i);
  const tieneTensio  = matchAny(/tensiom|tensi[oó]n h[ií]drica/i);
  const tieneSuelo   = matchAny(/temperatura suelo|humedad suelo|soil temperature|soil moisture/i);

  if (tieneTensio)              return 'Estación de control de riego';
  if (tieneRad && tieneViento)  return 'Estación agroclimática';
  if (tieneTemp && tieneHum)    return 'Estación meteorológica';
  if (tieneSuelo)               return 'Sonda de suelo';
  return null;
}
