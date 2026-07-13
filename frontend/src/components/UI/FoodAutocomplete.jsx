import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
  const [pressedIndex, setPressedIndex] = useState(-1);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const justSelectedRef = useRef(false);
  const suppressCloseRef = useRef(false);
  // Il dropdown si apre solo dopo che l'utente ha digitato: un valore precompilato
  // (es. modifica piatto) non deve far comparire la lista
  const userTypedRef = useRef(false);
  // Distingue tap da scroll nel dropdown su touch screen
  const touchRef = useRef({ y: 0, moved: false });

  // Calcola la posizione del dropdown basandosi sull'input — funziona anche dentro modal
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    // visualViewport.offsetTop compensa lo scroll che iOS fa quando appare la tastiera
    const vvOffsetTop = window.visualViewport?.offsetTop ?? 0;
    setDropdownStyle({
      top: rect.bottom + vvOffsetTop + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    const query = value.trim().toLowerCase();
    if (query.length < 1) {
      setFiltered([]);
      setOpen(false);
      justSelectedRef.current = false;
      return;
    }
    const results = foods.filter(f => f.name.includes(query)).slice(0, 6);
    setFiltered(results);
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      // Non riaprire il dropdown dopo selezione esplicita
    } else if (userTypedRef.current) {
      setOpen(results.length > 0);
    }
    setActiveIndex(-1);
  }, [value, foods]);

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();

    // Chiude il dropdown se si tocca/clicca fuori da input E dropdown
    const handleClose = (e) => {
      if (suppressCloseRef.current) return;
      const insideInput = containerRef.current?.contains(e.target);
      const insideDropdown = dropdownRef.current?.contains(e.target);
      if (!insideInput && !insideDropdown) setOpen(false);
    };

    // Quando la tastiera iOS appare/scompare, aggiorna la posizione e blocca
    // temporaneamente la chiusura (il viewport shift può spostare il target del tap)
    const handleVVChange = () => {
      suppressCloseRef.current = true;
      updateDropdownPosition();
      setTimeout(() => { suppressCloseRef.current = false; }, 300);
    };

    const vv = window.visualViewport;
    document.addEventListener('mousedown', handleClose);
    // passive: true migliora lo scroll su iOS
    document.addEventListener('touchstart', handleClose, { passive: true });
    if (vv) {
      vv.addEventListener('resize', handleVVChange);
      vv.addEventListener('scroll', handleVVChange);
    }
    return () => {
      document.removeEventListener('mousedown', handleClose);
      document.removeEventListener('touchstart', handleClose);
      if (vv) {
        vv.removeEventListener('resize', handleVVChange);
        vv.removeEventListener('scroll', handleVVChange);
      }
    };
  }, [open, updateDropdownPosition]);

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
      handleSelect(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelect = (food) => {
    justSelectedRef.current = true;
    userTypedRef.current = false;
    onSelect(food);
    setOpen(false);
    setActiveIndex(-1);
    setPressedIndex(-1);
  };

  return (
    <>
      <div ref={containerRef} className={wrapperClassName || ''}>
        <input
          ref={inputRef}
          className={inputClassName}
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => { userTypedRef.current = true; onChange(e); }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (userTypedRef.current && filtered.length > 0) {
              updateDropdownPosition();
              setOpen(true);
            }
          }}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </div>

      {open && createPortal(
        <ul
          ref={dropdownRef}
          style={{ ...dropdownStyle, WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          className="fixed z-[9999] bg-slate-800 border border-violet-700 border-opacity-60 rounded-xl shadow-2xl overflow-y-auto max-h-[220px] overscroll-contain"
        >
          {filtered.map((food, i) => (
            <li
              key={`${food.name}-${food.default_quantity_type}`}
              className={`px-4 py-3 cursor-pointer flex justify-between items-center text-sm transition-colors min-h-[44px] ${
                i === activeIndex || i === pressedIndex ? 'bg-violet-700 text-white' : 'text-white hover:bg-slate-700'
              }`}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(food); }}
              onTouchStart={(e) => {
                touchRef.current = { y: e.touches[0].clientY, moved: false };
                setPressedIndex(i);
              }}
              onTouchMove={(e) => {
                // Se il dito si sposta è uno scroll: annulla evidenziazione e selezione
                if (Math.abs(e.touches[0].clientY - touchRef.current.y) > 10) {
                  touchRef.current.moved = true;
                  setPressedIndex(-1);
                }
              }}
              onTouchCancel={() => { touchRef.current.moved = true; setPressedIndex(-1); }}
              onTouchEnd={(e) => {
                setPressedIndex(-1);
                if (touchRef.current.moved) return; // era uno scroll, non un tap
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
        </ul>,
        document.body
      )}
    </>
  );
};

export default FoodAutocomplete;
