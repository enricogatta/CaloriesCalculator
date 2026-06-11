import React, { useState, useEffect, useRef } from 'react';

const UNIT_LABELS = {
  grams: 'g',
  unit: 'unità',
  teaspoon: 'cucchiaino',
  tablespoon: 'cucchiaio',
};

const FoodAutocomplete = ({
  value,
  onChange,
  onSelect,
  foods,
  placeholder,
  inputClassName,
  wrapperClassName,
  inputRef,
  autoFocus,
}) => {
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef(null);

  useEffect(() => {
    const query = value.trim().toLowerCase();
    if (query.length < 1) {
      setFiltered([]);
      setOpen(false);
      return;
    }
    const results = foods
      .filter(f => f.name.includes(query))
      .slice(0, 8);
    setFiltered(results);
    setOpen(results.length > 0);
    setActiveIndex(-1);
  }, [value, foods]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onSelect(filtered[activeIndex]);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (food) => {
    onSelect(food);
    setOpen(false);
    setActiveIndex(-1);
  };

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName || ''}`}>
      <input
        ref={inputRef}
        className={inputClassName}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (filtered.length > 0) setOpen(true); }}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {open && (
        <ul className="absolute z-50 w-full mt-1 bg-slate-800 border border-violet-700 border-opacity-60 rounded-xl shadow-2xl overflow-hidden">
          {filtered.map((food, i) => (
            <li
              key={`${food.name}-${food.default_quantity_type}`}
              className={`px-4 py-2.5 cursor-pointer flex justify-between items-center text-sm transition-colors ${
                i === activeIndex ? 'bg-violet-700 text-white' : 'text-white hover:bg-slate-700'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(food);
              }}
            >
              <span className="capitalize">{food.name}</span>
              <span className={`text-xs ml-2 shrink-0 ${i === activeIndex ? 'text-violet-200' : 'text-gray-400'}`}>
                {UNIT_LABELS[food.default_quantity_type] ?? food.default_quantity_type}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FoodAutocomplete;
