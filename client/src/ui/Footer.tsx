import styles from './Footer.module.css';

interface FooterProps {
  onOpenBugReport?: () => void;
  onOpenTip?: () => void;
}

export function Footer({ onOpenBugReport, onOpenTip }: FooterProps) {
  const handleTipClick = () => {
    if (onOpenTip) {
      onOpenTip();
    } else {
      const tipElement = document.getElementById('tip-the-developer') || document.getElementById('tip-section');
      if (tipElement) {
        tipElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className={styles.footer}>
      {/* Two distinct footer action sections: Bug Report & Tip Developer */}
      <div className={styles.footerSections}>
        {/* Section 1: Report a Bug */}
        <div
          className={styles.footerSectionCard}
          onClick={onOpenBugReport}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenBugReport?.();
            }
          }}
          title="Click to report an issue or bug found in the game"
        >
          <div className={styles.footerCardIcon}>🐛</div>
          <div className={styles.footerCardContent}>
            <div className={styles.footerCardTitle}>Report a Bug</div>
            <div className={styles.footerCardDesc}>
              Found a bug or glitch in the water flume? Let us know and we'll fix it!
            </div>
          </div>
          <div className={styles.footerCardArrow}>➔</div>
        </div>

        {/* Section 2: Tip the Developer */}
        <div
          className={styles.footerSectionCard}
          onClick={handleTipClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleTipClick();
            }
          }}
          title="Click to tip the developer with Google Pay or UPI"
        >
          <div className={styles.footerCardIcon}>☕</div>
          <div className={styles.footerCardContent}>
            <div className={styles.footerCardTitle}>Tip the Developer</div>
            <div className={styles.footerCardDesc}>
              Enjoying this website? Support the developer with Google Pay / UPI!
            </div>
          </div>
          <div className={styles.footerCardArrow}>➔</div>
        </div>
      </div>

      <div className={styles.footerBrand}>
        <span>🚽💨</span>
        <span>Fun Together</span>
      </div>

      <div className={styles.footerLinks}>
        <span>Made with 💨 for multiplayer fun</span>
      </div>

      <div className={styles.copyright}>
        © {new Date().getFullYear()} Fun Together. All rights reserved.
      </div>
    </footer>
  );
}
