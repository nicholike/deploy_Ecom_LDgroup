import { useEffect, useMemo, useRef, useState } from "react";
import MlmTreeDiagram from "./MlmTreeDiagram";
import type { UserTreeNodeResponse } from "../../services/userService";

const MIN_SCALE = 0.4;
const MAX_SCALE = 2.5;

interface MlmTreeViewportProps {
  data: UserTreeNodeResponse[];
  isLoading: boolean;
  onDeleteUser?: (userId: string, username: string) => void;
  isAdmin?: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const MlmTreeViewport: React.FC<MlmTreeViewportProps> = ({ data, isLoading, onDeleteUser, isAdmin = false }) => {
  const [scale, setScale] = useState(0.85);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const hasData = useMemo(() => data.length > 0, [data.length]);

  const handleWheel: React.WheelEventHandler<HTMLDivElement> = (event) => {
    if (!hasData || !containerRef.current) return;
    event.preventDefault();

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    // Mouse position relative to viewport center
    const mouseX = event.clientX - rect.left - rect.width / 2;
    const mouseY = event.clientY - rect.top - rect.height / 2;

    // Calculate new scale
    const delta = event.deltaY > 0 ? -0.08 : 0.08;
    const newScale = clamp(scale + delta, MIN_SCALE, MAX_SCALE);

    // If scale didn't change (hit min/max), don't adjust offset
    if (newScale === scale) return;

    // Calculate point in world space (before zoom)
    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;

    // Adjust offset so the point under cursor stays in place
    const newOffset = {
      x: mouseX - worldX * newScale,
      y: mouseY - worldY * newScale,
    };

    setScale(newScale);
    setOffset(newOffset);
  };

  const handlePointerDown: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!hasData) return;

    // Don't interfere with clicks on node cards, buttons, or delete button
    const target = event.target as HTMLElement;
    if (target.closest('.node-card') || target.closest('.expand-btn') || target.closest('.node-delete-btn')) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    pointerRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerMove: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (!isDragging || !hasData) return;

    const deltaX = event.clientX - pointerRef.current.x;
    const deltaY = event.clientY - pointerRef.current.y;
    pointerRef.current = { x: event.clientX, y: event.clientY };

    setOffset((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));
  };

  const handlePointerUp: React.PointerEventHandler<HTMLDivElement> = (event) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setIsDragging(false);
  };

  const resetView = () => {
    setScale(0.85);
    setOffset({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    if (!containerRef.current) return;
    const newScale = clamp(scale + 0.1, MIN_SCALE, MAX_SCALE);
    if (newScale === scale) return;

    // Zoom to center when using keyboard shortcuts
    const worldX = -offset.x / scale;
    const worldY = -offset.y / scale;

    setOffset({
      x: -worldX * newScale,
      y: -worldY * newScale,
    });
    setScale(newScale);
  };

  const zoomOut = () => {
    if (!containerRef.current) return;
    const newScale = clamp(scale - 0.1, MIN_SCALE, MAX_SCALE);
    if (newScale === scale) return;

    // Zoom to center when using keyboard shortcuts
    const worldX = -offset.x / scale;
    const worldY = -offset.y / scale;

    setOffset({
      x: -worldX * newScale,
      y: -worldY * newScale,
    });
    setScale(newScale);
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!hasData) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom in: + or =
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      }
      // Zoom out: -
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      }
      // Reset: 0 or r
      if (e.key === '0' || e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasData]);

  return (
    <div className="relative h-screen w-full overflow-hidden bg-white dark:bg-gray-900">
      {/* Zoom indicator - floating */}
      {hasData && !isLoading && (
        <div className="absolute right-4 top-4 z-40 rounded-lg bg-black/80 px-3 py-1 text-xs font-medium text-white dark:bg-white/90 dark:text-black">
          {Math.round(scale * 100)}%
        </div>
      )}

      {/* Reset button - floating */}
      {hasData && !isLoading && (
        <button
          onClick={resetView}
          className="absolute left-4 top-4 z-40 rounded-lg bg-black px-3 py-2 text-xs font-medium text-white transition-all hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          title="Reset view (phím R hoặc 0)"
        >
          Đặt lại
        </button>
      )}

      {/* Help indicator - floating */}
      {hasData && !isLoading && (
        <div className="absolute bottom-4 right-4 z-40 rounded-lg bg-black/70 px-3 py-2 text-xs text-white dark:bg-white/80 dark:text-black">
          <div className="font-medium mb-1">Phím tắt:</div>
          <div>+ / - : Zoom</div>
          <div>R / 0 : Reset</div>
        </div>
      )}

      {/* Fullscreen interactive area */}
      <div
        ref={containerRef}
        className={`relative h-full w-full select-none ${
          isDragging ? "cursor-grabbing" : hasData ? "cursor-grab" : "cursor-default"
        }`}
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'none',
          }}
        >
          {isLoading ? (
            <div className="rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-600 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Đang tải cây hệ thống...
            </div>
          ) : !hasData ? (
            <div className="rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-600 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
              Chưa có dữ liệu để hiển thị.
            </div>
          ) : (
            <MlmTreeDiagram
              data={data}
              onDeleteUser={onDeleteUser}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default MlmTreeViewport;
