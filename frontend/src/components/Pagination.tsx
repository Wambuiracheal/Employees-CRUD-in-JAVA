"use client";

const PAGE_SIZES = [5, 10, 20, 50];

interface Props {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange(page: number): void;
  onSizeChange(size: number): void;
}

/** Returns page indexes to show, with -1 marking an ellipsis gap. */
function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages = new Set([0, total - 1, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < total).sort((a, b) => a - b);
  const out: number[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(-1);
    out.push(p);
  });
  return out;
}

export function Pagination({ page, size, totalElements, totalPages, onPageChange, onSizeChange }: Props) {
  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  return (
    <div className="pagination">
      <div className="pagination-info">
        <span>
          {from}–{to} of {totalElements}
        </span>
        <label className="page-size">
          Rows per page
          <select className="select select-sm" value={size} onChange={(e) => onSizeChange(Number(e.target.value))}>
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>
      <nav className="pagination-pages" aria-label="Pagination">
        <button className="btn btn-sm" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
          ‹ Prev
        </button>
        {pageWindow(page, totalPages).map((p, i) =>
          p === -1 ? (
            <span key={`gap-${i}`} className="pagination-gap">
              …
            </span>
          ) : (
            <button
              key={p}
              className={`btn btn-sm${p === page ? " btn-primary" : ""}`}
              aria-current={p === page ? "page" : undefined}
              onClick={() => onPageChange(p)}
            >
              {p + 1}
            </button>
          ),
        )}
        <button className="btn btn-sm" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)}>
          Next ›
        </button>
      </nav>
    </div>
  );
}
