import type { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  actions?: ReactNode;
  outsideControls?: ReactNode;
  panelClassName?: string;
  bodyClassName?: string;
};

function Modal({
  open,
  title,
  description,
  children,
  onClose,
  actions,
  outsideControls,
  panelClassName,
  bodyClassName,
}: ModalProps) {
  if (!open) {
    return null;
  }

  const hasCustomMaxWidth = panelClassName?.includes('max-w') ?? false;

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

      {outsideControls ? (
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-20 hidden items-center justify-between px-1 min-[520px]:flex sm:px-3 lg:px-5 xl:px-8">
          {outsideControls}
        </div>
      ) : null}

      <div className={`modal-panel relative z-10 w-full ${hasCustomMaxWidth ? '' : 'max-w-xl'} overflow-hidden rounded-[2rem] border border-[#aebfd0] bg-[linear-gradient(180deg,#e6eef5_0%,#d8e3ec_100%)] shadow-[0_28px_70px_rgba(15,23,42,0.28)] ${panelClassName ?? ''}`}>
        <div className="flex items-start justify-between gap-4 border-b border-[#bccbd8] px-5 py-5 sm:px-6">
          <div>
            <h3 className="text-fluid-xl font-semibold tracking-[-0.03em] text-[#173b70]">
              {title}
            </h3>
            {description ? (
              <p className="mt-2 max-w-lg text-fluid-base leading-6 text-[#627d98]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#b7c7d6] bg-[rgba(255,255,255,0.88)] text-[#48617d] transition hover:bg-white"
            aria-label="Close modal"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className={bodyClassName ?? 'px-5 py-5 sm:px-6'}>{children}</div>

        {actions ? (
          <div className="flex flex-col-reverse gap-3 border-t border-[#bccbd8] bg-[rgba(230,238,245,0.82)] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default Modal;

