import styles from './Footer.module.css';

interface FooterProps {
  onOpenBugReport?: () => void;
}

export function Footer({ onOpenBugReport }: FooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerBrand}>
        <span>🚽💨</span>
        <span>Fun Together</span>
      </div>

      <div className={styles.footerLinks}>
        {onOpenBugReport && (
          <button
            type="button"
            className={styles.footerLink}
            onClick={onOpenBugReport}
          >
            🐛 Report a Bug
          </button>
        )}
        <span style={{ opacity: 0.3 }}>•</span>
        <span>Made with 💨 for multiplayer fun</span>
      </div>

      <div className={styles.copyright}>
        © {new Date().getFullYear()} Fun Together. All rights reserved.
      </div>
    </footer>
  );
}
