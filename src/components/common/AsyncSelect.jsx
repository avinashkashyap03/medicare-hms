import { useEffect, useRef, useState } from 'react';

// Search-as-you-type select backed by a service-layer search function.
// - Debounces typing (300ms) so one request per pause, not per keypress.
// - Never loads a whole table: `search` decides what to fetch (max 20).
// - The currently selected item stays visible even when it isn't part
//   of the latest search results (used while editing records).
function AsyncSelect({
  label,
  placeholder = 'Type to search...',
  value,
  onChange,
  search,
  getLabel,
  selected = null,
  disabled = false,
  required = false,
  clearable = true,
  emptyMessage = 'No matches found.',
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const aliveRef = useRef(true);
  const seqRef = useRef(0);
  const rootRef = useRef(null);
  const searchRef = useRef(search);

  // Unmount safety: no state updates after the component is gone.
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  // Keep the latest search function in a ref so the debounce effect
  // doesn't restart on every render (would cause a request loop).
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  // Close the menu when clicking anywhere outside.
  useEffect(() => {
    function onDocMouseDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // Debounced search whenever the menu is open and the query changes.
  useEffect(() => {
    if (!open) return undefined;
    const seq = ++seqRef.current;
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const items = await searchRef.current(query);
        if (seq !== seqRef.current || !aliveRef.current) return;
        setResults(items ?? []);
      } catch (err) {
        if (seq !== seqRef.current || !aliveRef.current) return;
        setResults([]);
        setError(err?.message || 'Search failed.');
      } finally {
        if (seq === seqRef.current && aliveRef.current) setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      seqRef.current += 1;
    };
  }, [open, query]);

  const handleSelect = (item) => {
    onChange(item);
    setQuery('');
    setOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setOpen(false);
    setResults([]);
  };

  const showSelected = query === '' && selected;

  return (
    <label className="form-field form-field--full async-select">
      <span>{label}{required ? ' *' : ''}</span>
      <div className="async-select__control" ref={rootRef}>
        <input
          type="text"
          value={showSelected ? getLabel(selected) : query}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
        />
        {clearable && selected && !disabled && (
          <button type="button" className="async-select__clear" aria-label="Clear selection" onClick={handleClear}>
            ×
          </button>
        )}
        {open && (
          <div className="async-select__menu">
            {loading && <div className="async-select__status">Searching…</div>}
            {!loading && error && <div className="async-select__status async-select__status--error">{error}</div>}
            {!loading && !error && results.length === 0 && (
              <div className="async-select__status">{emptyMessage}</div>
            )}
            {!loading &&
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`async-select__option${item.id === value ? ' is-selected' : ''}`}
                  onClick={() => handleSelect(item)}
                >
                  {getLabel(item)}
                </button>
              ))}
          </div>
        )}
      </div>
    </label>
  );
}

export default AsyncSelect;
