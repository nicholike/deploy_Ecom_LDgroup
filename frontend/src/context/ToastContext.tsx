import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

type ToastTone = "success" | "error" | "info";

type ToastRecord = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
};

type ShowToastInput = {
  tone?: ToastTone;
  title: string;
  description?: string;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (toast: ShowToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const generateToastId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const toneStyles: Record<ToastTone, { bg: string; border: string; icon: string }> = {
  success: { bg: "bg-green-50", border: "border-green-300", icon: "text-green-600" },
  error: { bg: "bg-red-50", border: "border-red-300", icon: "text-red-600" },
  info: { bg: "bg-blue-50", border: "border-blue-300", icon: "text-blue-600" },
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timeoutRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    const timeoutId = timeoutRef.current.get(id);
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      timeoutRef.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    ({ tone = "info", title, description, durationMs = 4000 }: ShowToastInput) => {
      const id = generateToastId();

      setToasts((prev) => [
        ...prev,
        {
          id,
          tone,
          title,
          description,
        },
      ]);

      const timeoutId = window.setTimeout(() => {
        removeToast(id);
      }, durationMs);

      timeoutRef.current.set(id, timeoutId);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-end gap-2 px-3 py-4 sm:px-4">
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto w-full max-w-[16rem] rounded-lg border bg-white shadow-md ring-1 ring-black/5 ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-2 px-3 py-2.5">
                <span className={`mt-0.5 inline-flex h-5 w-5 items-center justify-center text-sm ${styles.icon}`}>
                  {toast.tone === "success" && "✓"}
                  {toast.tone === "error" && "!"}
                  {toast.tone === "info" && "i"}
                </span>
                <div className="flex-1 text-[12px] leading-relaxed text-gray-900">
                  <p className="font-semibold">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 whitespace-pre-line text-[11px] leading-snug text-gray-700">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-gray-500 transition hover:bg-black/5 hover:text-gray-700"
                  aria-label="Đóng thông báo"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
