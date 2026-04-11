import type { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
};

function Modal({
  open,
  title,
  description,
  children,
  onClose,
  actions,
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-overlay absolute inset-0 bg-[#0d1f35]/55 backdrop-blur-[4px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="modal-panel relative z-10 w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#c7d7e6] bg-[linear-gradient(180deg,#f6f9fc_0%,#edf3f8_100%)] shadow-[0_28px_70px_rgba(15,23,42,0.24)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#d8e3ec] px-5 py-5 sm:px-6">
          <div>
            <h3 className="text-[1.25rem] font-semibold tracking-[-0.03em] text-[#173b70]">
              {title}
            </h3>
            {description ? (
              <p className="mt-2 max-w-lg text-[14px] leading-6 text-[#627d98]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#ccd9e5] bg-white/90 text-[#48617d] transition hover:bg-white"
            aria-label="Close modal"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5 sm:px-6">{children}</div>

        {actions ? (
          <div className="flex flex-col-reverse gap-3 border-t border-[#d8e3ec] bg-white/45 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Modal;
