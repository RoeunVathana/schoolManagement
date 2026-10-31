import { forwardRef, useState } from 'react';

const PasswordInput = forwardRef(function PasswordInput({ className = '', showLabel = 'Show password', hideLabel = 'Hide password', ...props }, ref) {
  const [visible, setVisible] = useState(false);

  return <div className="password-input-wrapper">
    <input {...props} ref={ref} type={visible ? 'text' : 'password'} className={className} />
    <button
      type="button"
      className="password-input-toggle"
      onClick={() => setVisible((current) => !current)}
      aria-label={visible ? hideLabel : showLabel}
      aria-pressed={visible}
      title={visible ? hideLabel : showLabel}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        {visible ? <><path d="M3 3l18 18" /><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.9 4.3A10.7 10.7 0 0 1 12 4c5.3 0 9 5 9 5s-1.2 1.7-3.2 3.2M6.2 6.2C4.2 7.6 3 9 3 9s3.7 5 9 5c.8 0 1.6-.1 2.3-.3" /></> : <><path d="M2.5 12s3.5-5 9.5-5 9.5 5 9.5 5-3.5 5-9.5 5-9.5-5-9.5-5Z" /><circle cx="12" cy="12" r="2.2" /></>}
      </svg>
    </button>
  </div>;
});

export default PasswordInput;
