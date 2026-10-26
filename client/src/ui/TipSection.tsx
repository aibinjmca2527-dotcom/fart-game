import { useState } from 'react';
import styles from './TipSection.module.css';

interface TipSectionProps {
  upiId?: string;
}

const TIP_AMOUNTS = [5, 10, 15, 20, 50];

export function TipSection({ upiId: propUpiId }: TipSectionProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [showQR, setShowQR] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Retrieve configurable UPI ID with fallback placeholder as requested
  const targetUpiId =
    propUpiId ||
    import.meta.env.VITE_DEVELOPER_UPI_ID ||
    'aibinjoseph9605573691@okicici';

  const targetName =
    import.meta.env.VITE_DEVELOPER_NAME ||
    'Aibin';

  const [qrType, setQrType] = useState<'dynamic' | 'official'>('dynamic');

  // Standard UPI payment deep link dynamically generated with developer UPI ID and amount
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(targetName)}&am=${selectedAmount}&cu=INR&tn=${encodeURIComponent('Developer Tip')}`;

  // Dedicated Google Pay / UPI intent handler
  const handleOpenPaymentApp = () => {
    // Check if on mobile or desktop
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (!isMobile) {
      // On desktop, auto-reveal the QR code so the user can easily scan with their phone
      setShowQR(true);
    }

    // Try navigating to standard UPI protocol handler
    window.location.href = upiDeepLink;
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(targetUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&format=svg&data=${encodeURIComponent(upiDeepLink)}`;

  return (
    <section className={styles.tipSection} aria-label="Tip the Developer">
      <div className={styles.tipHeader}>
        <h3 className={styles.title}>
          <span>☕</span>
          <span>Tip the Developer</span>
        </h3>
        <p className={styles.subtitle}>
          “Enjoying this website? Support the developer with a small tip!”
        </p>
      </div>

      {/* Selectable Tip Amounts */}
      <div className={styles.amountsGrid} role="radiogroup" aria-label="Select Tip Amount">
        {TIP_AMOUNTS.map((amt) => {
          const isSelected = selectedAmount === amt;
          return (
            <button
              key={amt}
              type="button"
              className={`${styles.amountBtn} ${isSelected ? styles.amountBtnActive : ''}`}
              onClick={() => setSelectedAmount(amt)}
              aria-checked={isSelected}
              role="radio"
            >
              <span>₹{amt}</span>
              <span className={styles.amountSub}>
                {amt === 5 ? 'Snack' : amt === 10 ? 'Tea' : amt === 20 ? 'Coffee' : amt === 50 ? 'Super Tip' : 'Tip'}
              </span>
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className={styles.actionsContainer}>
        <button
          type="button"
          className={styles.payPrimaryBtn}
          onClick={handleOpenPaymentApp}
          title={`Pay ₹${selectedAmount} via Google Pay or UPI App`}
        >
          <span style={{ fontSize: '20px' }}>⚡</span>
          <span>Pay ₹{selectedAmount} with Google Pay / UPI</span>
        </button>

        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setShowQR((prev) => !prev)}
          >
            <span>📱</span>
            <span>{showQR ? 'Hide QR Code' : 'Scan QR Code Fallback'}</span>
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleCopyUpi}
          >
            <span>📋</span>
            <span>{copied ? '✅ UPI ID Copied!' : 'Copy UPI ID'}</span>
          </button>
        </div>

        {/* QR Code Fallback Card */}
        {showQR && (
          <div className={styles.qrContainer}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${qrType === 'dynamic' ? styles.amountBtnActive : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setQrType('dynamic')}
              >
                ₹{selectedAmount} QR
              </button>
              <button
                type="button"
                className={`${styles.secondaryBtn} ${qrType === 'official' ? styles.amountBtnActive : ''}`}
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={() => setQrType('official')}
              >
                Google Pay QR
              </button>
            </div>

            <div className={styles.qrCard}>
              <img
                src={qrType === 'dynamic' ? dynamicQrUrl : '/developer-upi-qr.jpg'}
                alt={qrType === 'dynamic' ? `Scan to pay ₹${selectedAmount} to Aibin via UPI` : 'Aibin Google Pay QR Code'}
                className={styles.qrImage}
                style={{ objectFit: 'contain' }}
                loading="lazy"
              />
            </div>
            <p className={styles.qrInstruction}>
              {qrType === 'dynamic' ? (
                <>Scan using <strong>Google Pay</strong>, <strong>PhonePe</strong>, or <strong>Paytm</strong> to pay <strong>₹{selectedAmount}</strong> to <strong>{targetName}</strong>.</>
              ) : (
                <>Official <strong>Google Pay</strong> QR for <strong>{targetName}</strong> ({targetUpiId}).</>
              )}
            </p>
          </div>
        )}

        <div className={styles.upiInfoPill}>
          <span>Developer: <strong>{targetName}</strong></span>
          <span>•</span>
          <span>UPI ID:</span>
          <code style={{ color: '#FFD700', fontFamily: 'monospace' }}>{targetUpiId}</code>
        </div>

        <p className={styles.disclaimer}>
          🔒 Secure & direct: Payments happen entirely inside your chosen payment app. We never collect or store banking credentials, debit card info, or UPI PINs. Opening an app does not execute payment automatically until confirmed by you.
        </p>
      </div>
    </section>
  );
}
