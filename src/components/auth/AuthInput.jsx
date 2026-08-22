import { useState } from 'react';
import { BiHide, BiShow } from 'react-icons/bi';

function AuthInput({
  label,
  icon: Icon,
  type = 'text',
  id,
  name,
  placeholder,
  value,
  onChange,
  autoComplete,
  required = true,
  children,
}) {
  return (
    <div className="auth-field">
      <label htmlFor={id}>{label}</label>
      <div className="auth-input-group">
        <Icon className="auth-input-icon" />
        <input
          id={id}
          name={name}
          type={type}
          className={`auth-input${children ? ' auth-input--toggled' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
        />
        {children}
      </div>
    </div>
  );
}

function PasswordInput({ showToggle = true, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <AuthInput {...props} type={visible ? 'text' : 'password'}>
      {showToggle && (
        <button
          type="button"
          className="auth-input-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <BiHide /> : <BiShow />}
        </button>
      )}
    </AuthInput>
  );
}

export default AuthInput;
export { PasswordInput };
