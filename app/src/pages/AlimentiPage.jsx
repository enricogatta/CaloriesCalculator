import { useState } from 'react'
import { Apple, Plus, Search } from 'lucide-react'
import { PageTitle } from '../components/layout/PageTitle'
import { FoodRow } from '../components/foods/FoodRow'
import { FoodEditModal } from '../components/foods/FoodEditModal'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { inputClass } from '../components/ui/fieldStyles'
import { useAuth } from '../hooks/useAuth'
import { useData } from '../hooks/useData'
import { useDialog } from '../hooks/useDialog'
import {
  countFoodUsage,
  createFood,
  deleteFood,
  recalculateFoodItems,
  updateFood,
} from '../services/foodsService'
import { UNIT_LABELS, normalizeFoodName } from '../utils/nutrition'

const VALUE_KEYS = ['calories_per_unit', 'protein_per_unit', 'carbs_per_unit', 'fat_per_unit', 'grams_per_unit']
const NETWORK_MESSAGE = 'Salvataggio non riuscito. Controlla la connessione e riprova.'

const duplicateError = (name, quantityType) => ({
  field: 'name',
  message: `Hai già «${name}» misurato in ${UNIT_LABELS[quantityType]}: cambia nome o modifica quello esistente.`,
})

/**
 * AlimentiPage
 * Libreria dei cibi dell'utente: ricerca, creazione a mano, correzione dei valori
 * (con ricalcolo facoltativo dei piatti già registrati) ed eliminazione dei cibi non usati.
 */
export function AlimentiPage() {
  const { user } = useAuth()
  const { foods, upsertFoodLocal, removeFoodLocal, refreshAll } = useData()
  const { confirm, notice } = useDialog()
  const [query, setQuery] = useState('')
  // null = modale chiuso; { food: null } = nuovo; { food } = modifica
  const [editing, setEditing] = useState(null)

  const normalizedQuery = normalizeFoodName(query)
  const visibleFoods = normalizedQuery ? foods.filter(f => f.name.includes(normalizedQuery)) : foods

  const handleCreate = async (fields) => {
    const name = normalizeFoodName(fields.name)
    const { data, error } = await createFood(user.id, { ...fields, name })
    if (error) {
      return { error: error.code === '23505' ? duplicateError(name, fields.default_quantity_type) : { message: NETWORK_MESSAGE } }
    }
    upsertFoodLocal(data)
    setEditing(null)
    return { error: null }
  }

  const handleUpdate = async (food, fields) => {
    const name = normalizeFoodName(fields.name)
    // Il tipo di unità non cambia: si aggiornano solo nome e valori
    const changes = { ...fields, name }
    delete changes.default_quantity_type
    const { data, error } = await updateFood(food.id, changes)
    if (error) {
      return { error: error.code === '23505' ? duplicateError(name, food.default_quantity_type) : { message: NETWORK_MESSAGE } }
    }
    upsertFoodLocal(data)
    setEditing(null)

    const valuesChanged = VALUE_KEYS.some(key => Math.abs((data[key] ?? 0) - (food[key] ?? 0)) > 1e-6)
    if (!valuesChanged) return { error: null }

    const { count } = await countFoodUsage(food.id)
    if (!count) return { error: null }

    const recalculate = await confirm({
      title: `Aggiornare anche ${count === 1 ? 'il piatto già registrato' : `i ${count} piatti già registrati`}?`,
      message: `Hai cambiato i valori di «${name}». I piatti già nel diario possono restare come sono oppure essere ricalcolati con i nuovi valori.`,
      confirmLabel: count === 1 ? 'Aggiorna il piatto' : `Aggiorna ${count} piatti`,
      cancelLabel: 'Solo da ora in poi',
    })
    if (!recalculate) return { error: null }

    const { error: recalcError } = await recalculateFoodItems(food.id)
    if (recalcError) {
      notice({
        title: 'Piatti non aggiornati',
        message: 'L\'alimento è stato salvato, ma il ricalcolo dei piatti non è riuscito. Riprova salvandolo di nuovo.',
        tone: 'danger',
      })
    } else {
      // Diario e statistiche ricaricano i propri dati
      refreshAll()
    }
    return { error: null }
  }

  const handleDelete = async (food) => {
    setEditing(null)
    const { count, error } = await countFoodUsage(food.id)
    if (error) {
      notice({ title: 'Eliminazione non riuscita', message: 'Controlla la connessione e riprova.', tone: 'danger' })
      return
    }
    if (count > 0) {
      notice({
        title: `«${food.name}» è nel diario`,
        message: `È usato in ${count === 1 ? 'un piatto' : `${count} piatti`}, quindi non si può eliminare. Puoi rinominarlo o correggerne i valori; per eliminarlo togli prima quei piatti dal diario.`,
      })
      return
    }
    const ok = await confirm({
      title: `Eliminare «${food.name}»?`,
      message: 'Sparisce dalla libreria e dai suggerimenti. Se lo aggiungerai di nuovo, i valori li ricalcolerà Gemini.',
      confirmLabel: 'Elimina',
      tone: 'danger',
    })
    if (!ok) return
    const { error: deleteError } = await deleteFood(food.id)
    if (deleteError) {
      notice({ title: 'Eliminazione non riuscita', message: 'Controlla la connessione e riprova.', tone: 'danger' })
      return
    }
    removeFoodLocal(food.id)
  }

  return (
    <>
      <PageTitle
        eyebrow="Libreria"
        title="I tuoi"
        accent="alimenti."
        description="Ogni cibo che aggiungi al diario finisce qui con i suoi valori: le volte dopo non serve richiamare l'AI."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-content-muted" aria-hidden="true" />
          <input
            type="search"
            aria-label="Cerca un alimento"
            placeholder="Cerca"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={`${inputClass()} pl-12`}
          />
        </div>
        <Button icon={Plus} onClick={() => setEditing({ food: null })}>Nuovo alimento</Button>
      </div>

      {foods.length === 0 && (
        <EmptyState
          icon={Apple}
          title="La libreria è vuota"
          description="Si riempie da sola quando aggiungi alimenti al diario. Puoi anche crearne uno a mano con i valori dell'etichetta."
        />
      )}

      {foods.length > 0 && visibleFoods.length === 0 && (
        <EmptyState
          icon={Search}
          title={`Nessun alimento contiene «${query.trim()}»`}
          description="Controlla come l'hai scritto, oppure crealo con «Nuovo alimento»."
        />
      )}

      {visibleFoods.length > 0 && (
        <>
          <p className="mb-2 px-4 text-sm text-content-muted" aria-live="polite">
            {visibleFoods.length === 1 ? '1 alimento' : `${visibleFoods.length} alimenti`}
          </p>
          <Card as="div" className="overflow-hidden">
            <ul className="divide-y divide-line">
              {visibleFoods.map(food => (
                <FoodRow key={food.id} food={food} onOpen={() => setEditing({ food })} />
              ))}
            </ul>
          </Card>
        </>
      )}

      {editing && (
        <FoodEditModal
          food={editing.food}
          onClose={() => setEditing(null)}
          onSubmit={(fields) => (editing.food ? handleUpdate(editing.food, fields) : handleCreate(fields))}
          onDelete={() => handleDelete(editing.food)}
        />
      )}
    </>
  )
}
