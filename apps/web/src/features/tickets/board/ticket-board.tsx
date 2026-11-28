import { TICKET_STATUSES, type TicketListItemDto, type TicketStatus } from '@arweqah-platform/shared';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMe } from '@/core/auth/session';
import { usePermissions } from '@/core/permissions/can';
import { KanbanColumn } from '@/shared/ui';
import type { TicketAction } from '../api';
import { ActionDialog } from '../details/ticket-actions';
import { TicketCard, TicketCardBody } from './ticket-card';
import { ACTION_KEY, moveAction, moveTargets } from './ticket-moves';

function TicketColumn({ status, tickets, targetsOf, onMove }: { status: TicketStatus; tickets: TicketListItemDto[]; targetsOf: (ticket: TicketListItemDto) => TicketStatus[]; onMove: (ticket: TicketListItemDto, to: TicketStatus) => void }) {
  const { t } = useTranslation('tickets');
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <KanbanColumn columnRef={setNodeRef} title={t(`status.${status}`)} count={tickets.length} highlighted={isOver}>
      {tickets.map((x) => <TicketCard key={x.id} ticket={x} targets={targetsOf(x)} onMove={onMove} />)}
    </KanbanColumn>
  );
}

/**
 * The Kanban board of tickets, one column per status. A card moves by its handle or its «move to» menu when an action leads to that column
 * and the person holds its key (the unit asks to close or closes without execution; the sender confirms, declines or reopens). Every move opens
 * the action's own window (an optional message) and the API decides: a refusal shows in the window and the card stays.
 */
export function TicketBoard({ tickets }: { tickets: TicketListItemDto[] }) {
  const { t } = useTranslation('tickets');
  const viewerId = useMe().data?.id;
  const { can } = usePermissions();
  const [asking, setAsking] = useState<{ ticket: TicketListItemDto; action: TicketAction } | null>(null);
  const [dragged, setDragged] = useState<TicketListItemDto | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor));
  const targetsOf = (ticket: TicketListItemDto) => moveTargets(ticket, TICKET_STATUSES, viewerId, can);
  const move = (ticket: TicketListItemDto, to: TicketStatus) => {
    if (ticket.status === to) return;
    const action = moveAction(ticket, to, viewerId);
    if (action && can(ACTION_KEY[action])) setAsking({ ticket, action });
    else toast.warning(t('board.moveNotAllowed'));
  };
  const find = (id: unknown) => tickets.find((x) => x.id === id) ?? null;
  const onEnd = (event: DragEndEvent) => {
    setDragged(null);
    const ticket = find(event.active.id);
    const to = String(event.over?.id ?? '');
    if (ticket && (TICKET_STATUSES as readonly string[]).includes(to)) move(ticket, to as TicketStatus);
  };
  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragged(find(e.active.id))} onDragEnd={onEnd} onDragCancel={() => setDragged(null)}>
      <div className="flex gap-3 overflow-x-auto pb-2" tabIndex={0} role="region" aria-label={t('board.label')}>
        {TICKET_STATUSES.map((status) => <TicketColumn key={status} status={status} tickets={tickets.filter((x) => x.status === status)} targetsOf={targetsOf} onMove={move} />)}
      </div>
      <DragOverlay>{dragged && <div className="w-72 rounded-2xl border border-link bg-white p-3 shadow-lg"><TicketCardBody ticket={dragged} /></div>}</DragOverlay>
      {asking && <ActionDialog ticketId={asking.ticket.id} action={asking.action} onClose={() => setAsking(null)} />}
    </DndContext>
  );
}
