import { useEffect, useId, useRef } from 'react';

function Modal({
  open,
  onClose,
  header,
  headerActions,
  headerClassName,
  showClose = true,
  size,
  variant = 'dialog',
  blocked = false,
  className = '',
  children,
}) {
  // useId gives every modal instance a unique title id, so multiple
  // modals on one page never produce duplicate IDs.
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  const blockedRef = useRef(blocked);

  // Keep refs in sync so the keydown listener never closes over a
  // stale onClose/blocked value.
  useEffect(() => {
    onCloseRef.current = onClose;
    blockedRef.current = blocked;
  });

  // Escape closes the dialog (unless blocked), listener only active
  // while the modal is open and removed on cleanup.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && !blockedRef.current) onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  if (!open) return null;

  const sizeClass = size ? ` modal--${size}` : '';
  const close = () => {
    if (!blocked) onClose();
  };
  const headerIsString = typeof header === 'string';

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className={`modal${sizeClass}${className ? ` ${className}` : ''}`}
        role={variant}
        aria-modal="true"
        aria-labelledby={headerIsString ? titleId : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-head${headerClassName ? ` ${headerClassName}` : ''}`}>
          {headerIsString ? <h2 id={titleId}>{header}</h2> : header}
          {(headerActions || showClose) && (
            <div className="row-actions">
              {headerActions}
              {showClose && (
                <button type="button" className="icon-btn--sm" aria-label="Close" onClick={close}>
                  ×
                </button>
              )}
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
