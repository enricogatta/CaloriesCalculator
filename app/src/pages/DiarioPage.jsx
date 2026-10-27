import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { CloudOff, Plus, UtensilsCrossed } from 'lucide-react'
import { PageTitle } from '../components/layout/PageTitle'
import { WeekStrip } from '../components/diary/WeekStrip'
import { DailySummary } from '../components/diary/DailySummary'
import { MealCard } from '../components/diary/MealCard'
import { FoodFormModal } from '../components/diary/FoodFormModal'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useData } from '../hooks/useData'
import { useDiary } from '../hooks/useDiary'
import { useDialog } from '../hooks/useDialog'
import { formatDayMonth, formatRelativeDay, todayStr } from '../utils/dates'
import { categoryForTime, sumMacros } from '../utils/nutrition'

const DELETE_ERROR = {
  title: 'Eliminazione non riuscita',
  message: 'Controlla la connessione e riprova.',
  tone: 'danger',
}

/**
 * DiarioPage
 * Il diario di un giorno: settimana, totali contro obiettivi, pasti.
 * La data sta nell'URL (?data=YYYY-MM-DD) così indietro/avanti del browser funzionano.
 */
export function DiarioPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const date = searchParams.get('data') || todayStr()
  const { foods, goals } = useData()
  const diary = useDiary(date)
  const { confirm, notice } = useDialog()
  // null = modale chiuso; altrimenti { mode, card, dish }
  const [form, setForm] = useState(null)

  const setDate = (next) => {
    setSearchParams(next === todayStr() ? {} : { data: next }, { replace: true })
  }

  const totals = sumMacros(diary.cards.flatMap(card => card.dishes))
  const isEmpty = !diary.loading && diary.cards.length === 0

  const openAdd = (card = null) => setForm({ mode: 'add', card, dish: null })
  const openEdit = (card, dish) => setForm({ mode: 'edit', card, dish })

  const handleDeleteDish = async (card, dish) => {
    const ok = await confirm({
      title: `Eliminare ${dish.food}?`,
      message: `Il piatto viene tolto da ${card.category.toLowerCase()}.`,
      confirmLabel: 'Elimina',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await diary.deleteDish(card, dish)
    if (error) notice(DELETE_ERROR)
  }

  const handleDeleteCard = async (card) => {
    const count = card.dishes.length
    const ok = await confirm({
      title: `Eliminare ${card.category.toLowerCase()}?`,
      message: `Vengono eliminati ${count === 1 ? 'il piatto' : `tutti i ${count} piatti`} di questo pasto.`,
      confirmLabel: 'Elimina pasto',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await diary.deleteCard(card)
    if (error) notice(DELETE_ERROR)
  }

  const handleClearDay = async () => {
    const ok = await confirm({
      title: 'Svuotare la giornata?',
      message: `Vengono eliminati tutti i pasti del ${formatDayMonth(date)}. Non si può annullare.`,
      confirmLabel: 'Svuota giorno',
      tone: 'danger',
    })
    if (!ok) return
    const { error } = await diary.clearDay()
    if (error) notice(DELETE_ERROR)
  }

  const formInitial = form?.dish
    ? {
        category: form.card.category,
        foodName: form.dish.food,
        quantity: String(form.dish.quantity),
        quantityType: form.dish.quantityType,
      }
    : { category: form?.card?.category ?? categoryForTime() }

  return (
    <>
      <PageTitle eyebrow="Diario alimentare" title={formatRelativeDay(date)} accent={`${formatDayMonth(date)}.`} />

      <WeekStrip selectedDate={date} onChange={setDate} loggedDates={diary.loggedDates} />

      <DailySummary totals={totals} goals={goals} />

      <Button size="lg" icon={Plus} fullWidth onClick={() => openAdd()} className="mb-8">
        Aggiungi alimento
      </Button>

      {diary.error && !isEmpty && (
        <p role="alert" className="mb-4 rounded-md bg-danger/10 p-4 text-sm text-danger">
          Non riesco ad aggiornare i pasti: quelli mostrati potrebbero non essere aggiornati.
        </p>
      )}

      {diary.loading && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Caricamento pasti">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      )}

      {isEmpty && diary.error && (
        <EmptyState
          icon={CloudOff}
          tone="danger"
          title="Non riesco a caricare i pasti"
          description="Controlla la connessione e riprova."
          action={<Button variant="secondary" onClick={diary.reload}>Riprova</Button>}
        />
      )}

      {isEmpty && !diary.error && (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nessun pasto registrato"
          description="Tocca «Aggiungi alimento» e scrivi cosa hai mangiato: le calorie si calcolano da sole."
        />
      )}

      {!diary.loading && diary.cards.length > 0 && (
        <div className="flex flex-col gap-4">
          {diary.cards.map(card => (
            <MealCard
              key={card.category}
              card={card}
              onAddDish={() => openAdd(card)}
              onEditDish={(dish) => openEdit(card, dish)}
              onDeleteDish={(dish) => handleDeleteDish(card, dish)}
              onDeleteCard={() => handleDeleteCard(card)}
            />
          ))}
          <div className="flex justify-center pt-4">
            <Button variant="danger-ghost" onClick={handleClearDay}>Svuota giorno</Button>
          </div>
        </div>
      )}

      {form && (
        <FoodFormModal
          mode={form.mode}
          initial={formInitial}
          lockCategory={Boolean(form.card)}
          foods={foods}
          onClose={() => setForm(null)}
          onSubmit={(values) => diary.saveDish({ ...values, card: form.card, dish: form.dish })}
        />
      )}
    </>
  )
}
