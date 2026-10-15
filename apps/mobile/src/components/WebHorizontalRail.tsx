import {
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type WheelEvent,
} from 'react';

type DragState = {
  readonly pointerId: number | null;
  readonly scrollLeft: number;
  readonly startX: number;
};

type WebHorizontalRailProps = {
  readonly accessibilityLabel: string;
  readonly children: ReactNode;
  readonly testID: string;
};

const dragThresholdPx = 6;

const idleDragState: DragState = {
  pointerId: null,
  scrollLeft: 0,
  startX: 0,
};

export function WebHorizontalRail({
  accessibilityLabel,
  children,
  testID,
}: WebHorizontalRailProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<DragState>(idleDragState);
  const didDragRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  function handlePointerDown(event: PointerEvent<HTMLDivElement>): void {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    didDragRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      scrollLeft: event.currentTarget.scrollLeft,
      startX: event.clientX,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>): void {
    const dragState = dragStateRef.current;

    if (dragState.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.startX;

    if (Math.abs(deltaX) > dragThresholdPx) {
      didDragRef.current = true;
    }

    event.currentTarget.scrollLeft = dragState.scrollLeft - deltaX;
    event.preventDefault();
  }

  function endDrag(event: PointerEvent<HTMLDivElement>): void {
    if (dragStateRef.current.pointerId !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragStateRef.current = idleDragState;
    setDragging(false);
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>): void {
    if (!didDragRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    didDragRef.current = false;
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>): void {
    const rail = railRef.current;

    if (!rail || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
      return;
    }

    // Desktop browsers do not naturally drag overflow rails, so the wheel also
    // nudges this content sideways while keeping vertical page scroll available.
    rail.scrollLeft += event.deltaY;
    event.preventDefault();
  }

  const railStyle: CSSProperties = {
    cursor: dragging ? 'grabbing' : 'grab',
    display: 'flex',
    flexDirection: 'row',
    gap: 12,
    overflowX: 'auto',
    overscrollBehaviorX: 'contain',
    paddingRight: 20,
    scrollbarWidth: 'thin',
    touchAction: 'pan-y',
    userSelect: dragging ? 'none' : 'auto',
  };

  return (
    <div
      aria-label={accessibilityLabel}
      data-testid={testID}
      onClickCapture={handleClickCapture}
      onDragStart={(event) => event.preventDefault()}
      onPointerCancel={endDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onWheel={handleWheel}
      ref={railRef}
      role="region"
      style={railStyle}
      tabIndex={0}
    >
      {children}
    </div>
  );
}
