import { useEffect } from 'react';
import { FiAlertCircle, FiCheckCircle, FiX } from 'react-icons/fi';

type NotificationPopupProps = {
  open: boolean;
  title: string;
  message: string;
  variant: 'success' | 'error';
  onClose: () => void;
};

function NotificationPopup({
  open,
  title,
  message,
  variant,
  onClose,
}: NotificationPopupProps) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, 4000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const isSuccess = variant === 'success';

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(3.84rem,calc(100vw-0.32rem))]">
      <div
        className={`pointer-events-auto overflow-hidden rounded-3xl border shadow-[0_22px_60px_rgba(15,23,42,0.22)] backdrop-blur-sm ${
          isSuccess
            ? 'border-emerald-200/80 bg-white/95'
            : 'border-rose-200/80 bg-white/95'
        }`}
        role="status"
        aria-live="polite"
      >
        <div
          className={`h-1.5 w-full ${
            isSuccess ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />
        <div className="flex items-start gap-3 p-4">
          <div
            className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
              isSuccess
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-rose-50 text-rose-600'
            }`}
          >
            {isSuccess ? (
              <FiCheckCircle className="h-5 w-5" />
            ) : (
              <FiAlertCircle className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm leading-5 text-slate-600">{message}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close notification"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotificationPopup;
