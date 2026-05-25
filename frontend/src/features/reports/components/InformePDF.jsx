import {
  Document, Page, Text, View, StyleSheet,
} from '@react-pdf/renderer';

const C = {
  green:      '#166534',
  greenMid:   '#15803d',
  greenLight: '#dcfce7',
  greenBorder:'#86efac',
  greenBg:    '#f0fdf4',
  text:       '#0f172a',
  muted:      '#475569',
  subtle:     '#94a3b8',
  white:      '#ffffff',
};

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    color: C.text,
    backgroundColor: C.white,
    paddingBottom: 44,
  },

  // Header
  header: {
    backgroundColor: C.green,
    paddingHorizontal: 32,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: { color: C.white, fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 2 },
  headerSub:   { color: C.greenLight, fontSize: 7.5 },
  headerRight: { alignItems: 'flex-end' },
  headerPeriodLabel: { color: C.greenLight, fontSize: 7, marginBottom: 2 },
  headerPeriod:      { color: C.white, fontSize: 8, fontFamily: 'Helvetica-Bold' },

  // Body
  body: { paddingHorizontal: 32, paddingTop: 14 },

  // Section title
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: C.green,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 5,
    marginTop: 14,
  },

  // Table
  table: {
    borderWidth: 1,
    borderColor: C.greenBorder,
    marginBottom: 10,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: C.green,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.greenBorder,
  },
  tableRowAlt: {
    flexDirection: 'row',
    backgroundColor: C.greenBg,
    borderTopWidth: 1,
    borderTopColor: C.greenBorder,
  },
  th: {
    color: C.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  td: {
    fontSize: 7.5,
    paddingVertical: 4,
    paddingHorizontal: 7,
    color: C.text,
  },
  tdRight: {
    textAlign: 'right',
  },
  tdMuted: {
    color: C.muted,
  },

  // Day separator
  dayBar: {
    backgroundColor: C.greenMid,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dayBarText: { color: C.white, fontFamily: 'Helvetica-Bold', fontSize: 8 },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.greenBorder,
    backgroundColor: C.white,
  },
  footerText: { fontSize: 6.5, color: C.subtle },
});

const W = { nombre: '44%', unidad: '14%', min: '14%', max: '14%', avg: '14%' };

/** Fila de cabecera de tabla PDF con columnas: Metrica, Unidad, Min, Max, Media. */
function TableHeaderRow() {
  return (
    <View style={s.tableHeaderRow}>
      <Text style={[s.th, { width: W.nombre }]}>Métrica</Text>
      <Text style={[s.th, { width: W.unidad }]}>Unidad</Text>
      <Text style={[s.th, { width: W.min, textAlign: 'right' }]}>Mín</Text>
      <Text style={[s.th, { width: W.max, textAlign: 'right' }]}>Máx</Text>
      <Text style={[s.th, { width: W.avg, textAlign: 'right' }]}>Media</Text>
    </View>
  );
}

/**
 * Fila de datos de una metrica con filas alternas.
 * @param {Object} props
 * @param {Object} props.m - Objeto metrica con nombre, unidad, min, max, avg.
 * @param {number} props.idx - Indice para alternar color de fila.
 */
function MetricaRow({ m, idx }) {
  const rowStyle = idx % 2 === 0 ? s.tableRow : s.tableRowAlt;
  return (
    <View style={rowStyle}>
      <Text style={[s.td, { width: W.nombre }]}>{m.nombre}</Text>
      <Text style={[s.td, s.tdMuted, { width: W.unidad }]}>{m.unidad || '—'}</Text>
      <Text style={[s.td, s.tdRight, { width: W.min }]}>{m.min}</Text>
      <Text style={[s.td, s.tdRight, { width: W.max }]}>{m.max}</Text>
      <Text style={[s.td, s.tdRight, { width: W.avg }]}>{m.avg}</Text>
    </View>
  );
}

/**
 * Seccion de resumen del periodo con tabla de metricas.
 * @param {Object} props
 * @param {Array} props.resumen - Array de metricas del resumen global.
 */
function SummarySection({ resumen }) {
  return (
    <>
      <Text style={s.sectionTitle}>Resumen del período completo</Text>
      <View style={s.table}>
        <TableHeaderRow />
        {resumen.map((m, i) => <MetricaRow key={m.nombre} m={m} idx={i} />)}
      </View>
    </>
  );
}

/**
 * Bloque de un dia con barra de fecha y tabla de metricas. No se parte entre paginas.
 * @param {Object} props
 * @param {Object} props.dia - Objeto con fecha y array de metricas del dia.
 */
function DayBlock({ dia }) {
  return (
    <View wrap={false} style={{ marginBottom: 6 }}>
      <View style={s.dayBar}>
        <Text style={s.dayBarText}>{dia.fecha}</Text>
      </View>
      <View style={[s.table, { marginBottom: 0, borderTopWidth: 0 }]}>
        {dia.metricas.map((m, i) => <MetricaRow key={m.nombre} m={m} idx={i} />)}
      </View>
    </View>
  );
}

/**
 * Documento PDF del informe de estacion con cabecera, resumen global y detalle diario.
 * @component
 * @param {Object} props
 * @param {Object} props.data - Datos del informe: resumen y array de dias.
 * @param {string} props.stationName - Nombre de la estacion.
 * @param {string} props.from - Fecha de inicio en formato yyyy-MM-dd.
 * @param {string} props.to - Fecha de fin en formato yyyy-MM-dd.
 * @returns {JSX.Element}
 */
export default function ReportDocument({ data, stationName, from, to }) {
  const generado = new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  const sourceLabel = data.source === 'fieldclimate' ? 'FieldClimate' : 'Cesens';

  return (
    <Document title={`Informe ${stationName} ${from} ${to}`} author="Horizonte Verde Digital">
      <Page size="A4" style={s.page}>

        <View style={s.header} fixed>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Horizonte Verde Digital</Text>
            <Text style={s.headerSub}>{stationName}  ·  {sourceLabel}</Text>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerPeriodLabel}>Período</Text>
            <Text style={s.headerPeriod}>{from}  —  {to}</Text>
          </View>
        </View>

        <View style={s.body}>
          <SummarySection resumen={data.resumen} />

          <Text style={s.sectionTitle}>Detalle diario</Text>
          <View style={[s.table, { marginBottom: 0 }]}>
            <TableHeaderRow />
          </View>
          {data.dias.map(dia => <DayBlock key={dia.fecha} dia={dia} />)}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Horizonte Verde Digital</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Pág. ${pageNumber} de ${totalPages}`}
          />
          <Text style={s.footerText}>Generado: {generado}</Text>
        </View>

      </Page>
    </Document>
  );
}
