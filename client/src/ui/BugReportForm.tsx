import React, { useState, useRef } from 'react';
import { submitBugReport } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import styles from './BugReportForm.module.css';

interface BugReportFormProps {
  onSuccess?: (reportId?: string) => void;
  compact?: boolean;
}

export function BugReportForm({ onSuccess, compact = false }: BugReportFormProps) {
  const { user, profile } = useAuthStore();
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reportId, setReportId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot exceeds 5MB size limit. Please choose a smaller image.');
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate that the description is not empty
    if (!description.trim()) {
      setError('Please provide a description of the bug.');
      return;
    }

    setSubmitting(true);
    try {
      const reporterName = profile?.display_name || user?.user_metadata?.display_name || 'Guest';
      const reporterEmail = user?.email || undefined;

      const result = await submitBugReport({
        description: description.trim(),
        imageFile,
        reporterName,
        reporterEmail,
      });

      if (!result.ok) {
        setError(result.error || 'Failed to submit bug report. Please try again.');
        return;
      }

      setSuccess(result.message || 'Report submitted successfully! Thank you for helping improve the game.');
      if (result.reportId) {
        setReportId(result.reportId);
      }
      setDescription('');
      handleRemoveImage();
      if (onSuccess) {
        onSuccess(result.reportId);
      }
    } catch (err: unknown) {
      setError('Failed to submit bug report due to a network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.bugFormContainer}>
      {!compact && (
        <>
          <h2 className={styles.title}>
            <span>🐛</span>
            <span>Report a Bug</span>
          </h2>
          <p className={styles.subtitle}>
            Found an issue in the water flume or interface? Send a report and our team will fix it right away!
          </p>
        </>
      )}

      {success && (
        <div className={styles.successMsg}>
          <div className={styles.successTitle}>
            <span>✅</span>
            <span>Report Saved Successfully!</span>
          </div>
          <div>{success}</div>
          {reportId && (
            <div className={styles.reportIdBadge}>
              Report File: <strong>{reportId}.md</strong> (stored in <code>bugs/</code>)
            </div>
          )}
        </div>
      )}

      {error && (
        <div className={styles.errorMsg}>
          <span>⚠️</span>
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Description Field */}
        <div className={styles.field}>
          <label className={styles.label}>
            <span>Bug Description <span style={{ color: '#FF6B6B' }}>*</span></span>
            <span className={styles.labelHint}>{description.length}/5000</span>
          </label>
          <textarea
            className={styles.textarea}
            placeholder="Describe the bug you found…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={5000}
            required
            disabled={submitting}
          />
        </div>

        {/* Optional Image Upload Field */}
        <div className={styles.field}>
          <label className={styles.label}>
            <span>Screenshot (Optional)</span>
            <span className={styles.labelHint}>PNG, JPG, WebP up to 5MB</span>
          </label>

          {!imagePreview ? (
            <label className={styles.uploadBox}>
              <input
                ref={fileInputRef}
                className={styles.fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageChange}
                disabled={submitting}
              />
              <span className={styles.uploadIcon}>📸</span>
              <span className={styles.uploadText}>Upload a screenshot (optional)</span>
              <span className={styles.uploadSub}>Click or drag & drop image here</span>
            </label>
          ) : (
            <div className={styles.previewContainer}>
              <img src={imagePreview} alt="Screenshot preview" className={styles.previewImg} />
              <button
                type="button"
                className={styles.removeFileBtn}
                onClick={handleRemoveImage}
                title="Remove screenshot"
              >
                ✕
              </button>
            </div>
          )}

          {imageFile && (
            <div className={styles.fileInfo}>
              <span>📎 {imageFile.name} ({(imageFile.size / 1024).toFixed(1)} KB)</span>
            </div>
          )}
        </div>

        {/* Submit Report Button */}
        <button
          className={styles.submitBtn}
          type="submit"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span>⏳</span>
              <span>Submitting Report...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>Submit Report</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
