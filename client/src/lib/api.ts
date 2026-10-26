// ============================================================
// Fun Together — Client API Service (Bug Reporting & Backend)
// ============================================================

export interface BugReportInput {
  description: string;
  imageFile?: File | null;
  reporterName?: string;
  reporterEmail?: string;
}

export interface BugReportResult {
  ok: boolean;
  reportId?: string;
  filename?: string;
  message?: string;
  error?: string;
}

// Convert File to base64 Data URL
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

import { supabase, isSupabaseConfigured } from './supabase';

function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Submit a bug report to Supabase database and the backend API
export async function submitBugReport(input: BugReportInput): Promise<BugReportResult> {
  const { description, imageFile, reporterName, reporterEmail } = input;

  if (!description || !description.trim()) {
    return { ok: false, error: 'Please enter a description of the bug.' };
  }

  let imageDataUrl: string | undefined;
  let imageName: string | undefined;

  if (imageFile) {
    // Validate image file size (max 5MB)
    if (imageFile.size > 5 * 1024 * 1024) {
      return { ok: false, error: 'Screenshot file size exceeds 5MB limit.' };
    }
    try {
      imageDataUrl = await fileToDataUrl(imageFile);
      imageName = imageFile.name;
    } catch {
      return { ok: false, error: 'Could not read image file. Please try another image.' };
    }
  }

  const dateStr = getDateString();
  const randSuffix = Math.floor(100 + Math.random() * 900);
  const reportId = `bug-${dateStr}-${randSuffix}`;

  const payload = {
    reportId,
    description: description.trim(),
    image: imageDataUrl,
    imageName,
    reporterName: reporterName || 'Guest',
    reporterEmail: reporterEmail || undefined,
    environment: {
      url: window.location.href,
      platform: navigator.platform || 'Unknown',
      userAgent: navigator.userAgent || 'Unknown',
      screen: `${window.innerWidth}x${window.innerHeight} (screen: ${window.screen.width}x${window.screen.height})`,
    },
  };

  // 1. Try Supabase first (works 100% reliably in deployed Vercel apps directly from browser)
  if (isSupabaseConfigured) {
    try {
      const { error: dbError } = await supabase.from('bug_reports').insert({
        report_id: reportId,
        description: description.trim(),
        image_url: imageDataUrl || null,
        reporter_name: reporterName || 'Guest',
        reporter_email: reporterEmail || null,
        environment: payload.environment,
      });

      if (!dbError) {
        // Asynchronously notify /api/bugs if available (for GitHub sync)
        fetch('/api/bugs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }).catch(() => {});

        return {
          ok: true,
          reportId,
          filename: `${reportId}.md`,
          message: 'Bug report submitted and saved to database successfully!',
        };
      } else {
        console.warn('[Bugs] Supabase insert warning:', dbError.message);
      }
    } catch (sbErr) {
      console.warn('[Bugs] Supabase exception:', sbErr);
    }
  }

  // 2. Try server API route (/api/bugs)
  try {
    const res = await fetch('/api/bugs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      return {
        ok: true,
        reportId: data.reportId || reportId,
        filename: data.filename || `${reportId}.md`,
        message: data.message || 'Bug report submitted successfully!',
      };
    }
  } catch {
    // API not reachable
  }

  // 3. Fallback to local storage so user data is never lost
  try {
    const key = `local_bug_${Date.now()}`;
    localStorage.setItem(key, JSON.stringify({ ...payload, timestamp: new Date().toISOString() }));
    return {
      ok: true,
      reportId,
      filename: `${reportId}.md`,
      message: 'Bug report received and queued locally!',
    };
  } catch {
    return {
      ok: false,
      error: 'Failed to save bug report. Please check your connection and try again.',
    };
  }
}
