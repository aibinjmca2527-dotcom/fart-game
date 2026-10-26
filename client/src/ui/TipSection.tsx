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

  // Retrieve configurable UPI ID with fallback
  const targetUpiId =
    propUpiId ||
    import.meta.env.VITE_DEVELOPER_UPI_ID ||
    'aibinjoseph9605573691@okicici';

  const targetName =
    import.meta.env.VITE_DEVELOPER_NAME ||
    'Aibin';

  const [qrType, setQrType] = useState<'dynamic' | 'official'>('dynamic');

  // Standard generic UPI deep link
  const genericUpiLink = `upi://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(targetName)}&am=${selectedAmount}&cu=INR&tn=${encodeURIComponent('Developer Tip')}`;

  // Direct Google Pay Android Intent — target package ensures Android opens Google Pay directly, bypassing WhatsApp
  const gpayAndroidIntent = `intent://pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(targetName)}&am=${selectedAmount}&cu=INR&tn=${encodeURIComponent('Developer Tip')}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end;`;

  // Direct Google Pay iOS Schemes — targets Google Pay app specifically on iOS
  const gpayIosLink = `gpay://upi/pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(targetName)}&am=${selectedAmount}&cu=INR&tn=${encodeURIComponent('Developer Tip')}`;
  const tezIosLink = `tez://upi/pay?pa=${encodeURIComponent(targetUpiId)}&pn=${encodeURIComponent(targetName)}&am=${selectedAmount}&cu=INR&tn=${encodeURIComponent('Developer Tip')}`;

  // Direct Google Pay button click handler
  const handleOpenGooglePay = () => {
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isAndroid) {
      // Android: launch intent targeting Google Pay package directly (com.google.android.apps.nbu.paisa.user)
      window.location.href = gpayAndroidIntent;
    } else if (isIOS) {
      // iOS: try gpay:// scheme, then fallback to tez:// scheme
      const start = Date.now();
      window.location.href = gpayIosLink;
      setTimeout(() => {
        if (Date.now() - start < 1500) {
          window.location.href = tezIosLink;
        }
      }, 1000);
    } else {
      // Desktop: auto reveal QR code so user can scan with Google Pay
      setShowQR(true);
      window.location.href = genericUpiLink;
    }
  };

  // Other UPI Apps handler (PhonePe, Paytm, etc.)
  const handleOpenOtherUpi = () => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isMobile) {
      setShowQR(true);
    }
    window.location.href = genericUpiLink;
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(targetUpiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=svg&data=${encodeURIComponent(genericUpiLink)}`;

  return (
    <section id="tip-the-developer" className={styles.tipSection} aria-label="Tip the Developer">
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
        {/* Primary Direct Google Pay Button */}
        <button
          type="button"
          className={styles.gpayDirectBtn}
          onClick={handleOpenGooglePay}
          title={`Pay ₹${selectedAmount} directly with Google Pay to ${targetName}`}
        >
          <span className={styles.gpayLogo}>GPay</span>
          <span>Pay ₹{selectedAmount} with Google Pay</span>
        </button>

        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleOpenOtherUpi}
            title="Pay with other UPI apps like PhonePe, Paytm, BHIM"
          >
            <span>⚡</span>
            <span>Other UPI Apps</span>
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setShowQR((prev) => !prev)}
            title="Show or hide QR Code"
          >
            <span>📱</span>
            <span>{showQR ? 'Hide QR Code' : 'Show QR Code'}</span>
          </button>

          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={handleCopyUpi}
            title="Copy developer UPI ID to clipboard"
          >
            <span>📋</span>
            <span>{copied ? '✅ Copied!' : 'Copy UPI ID'}</span>
          </button>
        </div>

        {/* QR Code Container */}
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
                <>Scan with <strong>Google Pay</strong> to pay <strong>₹{selectedAmount}</strong> directly to <strong>{targetName}</strong>.</>
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
          🔒 Secure & direct: Opens Google Pay directly to transfer to {targetName}. No middleman, 100% direct UPI transfer.
        </p>
      </div>
    </section>
  );
}
