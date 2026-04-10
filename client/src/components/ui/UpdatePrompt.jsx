import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState } from 'react';

export default function UpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh || dismissed) return null;

  return (
    <div style={styles.banner}>
      <span style={styles.text}>Доступно обновление</span>
      <div style={styles.actions}>
        <button style={styles.button} onClick={() => updateServiceWorker(true)}>
          Обновить
        </button>
        <button style={styles.dismiss} onClick={() => setDismissed(true)}>
          ✕
        </button>
      </div>
    </div>
  );
}

const styles = {
  banner: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '10px 16px',
    backgroundColor: '#7a8a6e',
    color: '#fff',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '14px',
  },
  text: {
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  button: {
    padding: '4px 14px',
    border: '1.5px solid #fff',
    borderRadius: '8px',
    background: 'transparent',
    color: '#fff',
    fontFamily: 'DM Sans, sans-serif',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  dismiss: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '2px 4px',
    lineHeight: 1,
  },
};
