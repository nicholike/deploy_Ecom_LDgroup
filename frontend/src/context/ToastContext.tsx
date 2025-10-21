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
    bg: "bg-green-500/20", 
    border: "border-green-400/50", 
    icon: "text-green-600", 
    text: "text-gray-800" 
  },
  error: { 
    bg: "bg-red-500/20", 
    border: "border-red-400/50", 
    icon: "text-red-600", 
    text: "text-gray-800" 
  },
  info: { 
    bg: "bg-blue-500/20", 
    border: "border-blue-400/50", 
    icon: "text-blue-600", 
    text: "text-gray-800" 
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
      <div className="pointer-events-none fixed inset-0 z-[60] flex flex-col items-end gap-2 px-3 pt-16 py-4 sm:px-4">
        {toasts.map((toast) => {
          const styles = toneStyles[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto w-full max-w-[200px] backdrop-blur-md ${styles.bg} ${styles.border} border px-2 py-1.5 rounded-md text-[10px] text-left shadow-md`}
            >
              <div className="flex items-start gap-1.5">
                <span className={`inline-flex h-3 w-3 items-center justify-center text-[9px] font-semibold ${styles.icon}`}>
                  {toast.tone === "success" && "✓"}
                  {toast.tone === "error" && "!"}
                  {toast.tone === "info" && "i"}
                </span>
                <div className={`flex-1 ${styles.text}`}>
                  <p className="font-medium leading-tight text-[10px]">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-[8px] leading-snug opacity-90 whitespace-pre-line">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className={`ml-1 inline-flex h-3 w-3 items-center justify-center rounded-full transition hover:bg-white/10 ${styles.text} opacity-70 hover:opacity-100`}
                  aria-label="Đóng thông báo"
                >
                  <img src="/circle-xmark 1.svg" alt="Close" className="h-2.5 w-2.5" />
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
