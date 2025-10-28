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

const toneStyles: Record<ToastTone, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: "bg-green-500/20 dark:bg-green-500/30",
    border: "border-green-400/50 dark:border-green-400/60",
    icon: "text-green-600 dark:text-green-400",
    text: "text-gray-800 dark:text-gray-200"
  },
  error: {
    bg: "bg-red-500/20 dark:bg-red-500/30",
    border: "border-red-400/50 dark:border-red-400/60",
    icon: "text-red-600 dark:text-red-400",
    text: "text-gray-800 dark:text-gray-200"
  },
  info: {
    bg: "bg-blue-500/20 dark:bg-blue-500/30",
    border: "border-blue-400/50 dark:border-blue-400/60",
    icon: "text-blue-600 dark:text-blue-400",
    text: "text-gray-800 dark:text-gray-200"
  },
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
      <div className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-end gap-3 px-4 pt-20 py-6 sm:px-6">
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto w-full max-w-sm backdrop-blur-md ${styles.bg} ${styles.border} border px-4 py-3 rounded-lg text-sm text-left shadow-lg`}
            >
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-5 w-5 items-center justify-center text-sm font-bold ${styles.icon}`}>
                  {toast.tone === "success" && "✓"}
                  {toast.tone === "error" && "!"}
                  {toast.tone === "info" && "i"}
                </span>
                <div className={`flex-1 ${styles.text}`}>
                  <p className="font-semibold leading-tight text-sm">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-1 text-xs leading-relaxed opacity-90 whitespace-pre-line">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className={`ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full transition hover:bg-white/10 ${styles.text} opacity-70 hover:opacity-100`}
                  aria-label="Đóng thông báo"
                >
                  <img src="/circle-xmark 1.svg" alt="Close" className="h-4 w-4" />
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
