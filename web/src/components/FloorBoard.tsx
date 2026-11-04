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
import { useMemo, useState } from "react";
import type { Mesa, MesaZona } from "../types";
import { TableCard } from "./TableCard";

const zoneMeta: Array<{ id: MesaZona; label: string }> = [
  { id: "RESTAURANTE", label: "Comedor" },
  { id: "TERRAZA", label: "Terraza" },
  { id: "COMEDOR_2", label: "Comedor 2" },
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

  const availableZones = useMemo(
    () => zoneMeta.filter((zone) => mesas.some((mesa) => mesa.zona === zone.id)),
    [mesas],
  );

  const [selectedZone, setSelectedZone] = useState<MesaZona>(availableZones[0]?.id ?? "RESTAURANTE");

  const activeZone = availableZones.some((zone) => zone.id === selectedZone)
    ? selectedZone
    : availableZones[0]?.id ?? "RESTAURANTE";

  const zone = zoneMeta.find((item) => item.id === activeZone);

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

  const sections =
    activeZone === "BARRA"
      ? [
          { title: "Mesas de barra", clase: "MESA" as const },
          { title: "Puntos de barra", clase: "PUNTO_BARRA" as const },
        ]
      : [{ title: zone?.label ?? "Comedor", clase: undefined }];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label htmlFor="zona-selector" className="text-[12px] uppercase tracking-[0.16em] text-mute">
            Zona
          </label>
          <select
            id="zona-selector"
            value={activeZone}
            onChange={(event) => setSelectedZone(event.target.value as MesaZona)}
            className="rounded-full border border-line bg-canvas px-4 py-2 text-[14px] font-medium"
          >
            {availableZones.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[12px] uppercase tracking-[0.16em] text-mute">
          Arrastra o usa Espacio y flechas para reordenar
        </p>
      </div>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-[22px] font-semibold tracking-tight sm:text-[28px]">{zone?.label}</h2>
            <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] uppercase tracking-[0.16em] text-mute">
              {cardsFor(mesas, activeZone).length} mesas
            </span>
          </div>
        </div>
        {sections.map((section) => {
          const cards = cardsFor(mesas, activeZone, section.clase);
          if (cards.length === 0) return null;
          return (
            <div key={section.title} className="mb-6">
              {activeZone === "BARRA" ? (
                <h3 className="mb-3 text-[13px] font-medium uppercase tracking-[0.16em] text-mute">
                  {section.title}
                </h3>
              ) : null}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(activeZone, section.clase, event)}
              >
                <SortableContext items={cards.map((mesa) => mesa.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5">
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
    </div>
  );
}
