import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

/**
 * Calcula el rango de paginas visibles alrededor de la pagina actual.
 * Incluye elipsis ('…') cuando hay paginas ocultas entre los extremos.
 * @param {number} current - Pagina activa.
 * @param {number} total - Total de paginas.
 * @param {number} [windowSize=5] - Numero maximo de botones de pagina visibles.
 * @returns {Array<number|string>} Array de numeros de pagina o '…'.
 */
function buildPageWindow(current, total, windowSize = 5) {
  if (total <= windowSize) return Array.from({ length: total }, (_, i) => i + 1);
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, current - half);
  let end = start + windowSize - 1;
  if (end > total) { end = total; start = Math.max(1, end - windowSize + 1); }
  const pages = [];
  if (start > 1) { pages.push(1); if (start > 2) pages.push('…'); }
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total) { if (end < total - 1) pages.push('…'); pages.push(total); }
  return pages;
}

/**
 * Barra de paginacion con botones previo/siguiente, ventana de paginas y selector de tamano.
 * No renderiza nada si solo hay 1 pagina y no hay selector de tamano.
 * @component
 * @param {Object} props
 * @param {number} props.page - Pagina activa (base 1).
 * @param {number} props.totalPages - Total de paginas.
 * @param {number} props.pageSize - Tamano de pagina actual.
 * @param {Function} props.onPageChange - Callback al cambiar de pagina.
 * @param {Function} [props.onPageSizeChange] - Callback al cambiar tamano; omitir para ocultar el selector.
 * @returns {JSX.Element|null}
 */
export default function Pagination({ page, totalPages, pageSize, onPageChange, onPageSizeChange }) {
  const { t } = useTranslation();
  const pages = buildPageWindow(page, totalPages);

  if (totalPages <= 1 && !onPageSizeChange) return null;

  return (
    <div className="flex items-center justify-center gap-3 flex-wrap text-sm text-text-muted">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="btn-secondary px-2.5 py-1.5 flex items-center gap-1 text-xs disabled:opacity-40"
      >
        <ChevronLeft size={13} /> {t('common.previous')}
      </button>

      <div className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-text-subtle text-xs select-none">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] h-7 rounded-md text-xs font-medium transition-colors ${
                p === page
                  ? 'bg-primary text-bg font-bold'
                  : 'hover:bg-card hover:text-text text-text-muted'
              }`}
            >
              {p}
            </button>
          )
        )}
      </div>

      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="btn-secondary px-2.5 py-1.5 flex items-center gap-1 text-xs disabled:opacity-40"
      >
        {t('common.next')} <ChevronRight size={13} />
      </button>

      {onPageSizeChange && (
        <select
          value={pageSize}
          onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
          className="ml-2 bg-card border border-border text-text text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-primary/50"
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s} / {t('common.page')}</option>
          ))}
        </select>
      )}
    </div>
  );
}
