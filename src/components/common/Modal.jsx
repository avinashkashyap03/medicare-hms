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
  if (!open) return null;

  const sizeClass = size ? ` modal--${size}` : '';
  const close = () => {
    if (!blocked) onClose();
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className={`modal${sizeClass}${className ? ` ${className}` : ''}`}
        role={variant}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-head${headerClassName ? ` ${headerClassName}` : ''}`}>
          {typeof header === 'string' ? <h2>{header}</h2> : header}
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
