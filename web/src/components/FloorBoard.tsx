import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { Mesa, MesaZona } from "../types";
import { TableCard } from "./TableCard";

const zoneMeta: Array<{ id: MesaZona; label: string }> = [
  { id: "RESTAURANTE", label: "Comedor" },
  { id: "TERRAZA", label: "Terraza" },
  { id: "BARRA", label: "Barra" },
];

type FloorBoardProps = {
  mesas: Mesa[];
  selectedId: number | null;
  mergeIds: number[];
  mergeMode: boolean;
  now: number;
  onSelect: (id: number) => void;
  onReorder: (items: Array<{ id: number; layoutOrder: number }>) => void;
};

function cardsFor(mesas: Mesa[], zona: MesaZona, clase?: Mesa["clase"]) {
  const zone = mesas
    .filter((mesa) => mesa.zona === zona && (!clase || mesa.clase === clase))
    .slice()
    .sort((a, b) => a.layoutOrder - b.layoutOrder || a.numeroMesa - b.numeroMesa);

  const seen = new Set<number>();
  const cards: Mesa[] = [];
  for (const mesa of zone) {
    if (mesa.servicio) {
      if (seen.has(mesa.servicio.id)) continue;
      seen.add(mesa.servicio.id);
    }
    cards.push(mesa);
  }
  return cards;
}

export function FloorBoard({
  mesas,
  selectedId,
  mergeIds,
  mergeMode,
  now,
  onSelect,
  onReorder,
}: FloorBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(zona: MesaZona, clase: Mesa["clase"] | undefined, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const current = cardsFor(mesas, zona, clase);
    const oldIndex = current.findIndex((mesa) => mesa.id === active.id);
    const newIndex = current.findIndex((mesa) => mesa.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(current, oldIndex, newIndex);
    onReorder(moved.map((mesa, index) => ({ id: mesa.id, layoutOrder: index + 1 })));
  }

  return (
    <div className="space-y-8">
      {zoneMeta.map((zone) => {
        const sections =
          zone.id === "BARRA"
            ? [
                { title: "Mesas de barra", clase: "MESA" as const },
                { title: "Puntos de barra", clase: "PUNTO_BARRA" as const },
              ]
            : [{ title: zone.label, clase: undefined }];

        return (
          <section key={zone.id}>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[22px] font-semibold tracking-tight sm:text-[28px]">{zone.label}</h2>
              <p className="text-[12px] uppercase tracking-[0.16em] text-mute">
                Arrastra o usa Espacio y flechas para reordenar
              </p>
            </div>
            {sections.map((section) => {
              const cards = cardsFor(mesas, zone.id, section.clase);
              return (
                <div key={section.title} className="mb-6">
                  {zone.id === "BARRA" ? (
                    <h3 className="mb-3 text-[13px] font-medium uppercase tracking-[0.16em] text-mute">
                      {section.title}
                    </h3>
                  ) : null}
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(event) => handleDragEnd(zone.id, section.clase, event)}
                  >
                    <SortableContext items={cards.map((mesa) => mesa.id)} strategy={rectSortingStrategy}>
                      <div className="flex flex-wrap gap-3">
                        {cards.map((mesa) => (
                          <TableCard
                            key={mesa.id}
                            mesa={mesa}
                            selected={selectedId === mesa.id}
                            mergeSelected={mergeIds.includes(mesa.id)}
                            mergeMode={mergeMode}
                            now={now}
                            onSelect={onSelect}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
