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
          className="form-control auth-input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
        />
        {children}
      </div>
    </div>
  );
}

export default AuthInput;
