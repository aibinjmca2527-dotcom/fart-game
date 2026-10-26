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

// Submit a bug report to the backend API
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

  const payload = {
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

  try {
    // Attempt relative /api/bugs (proxied via Vite in dev or served on deployed origin)
    const res = await fetch('/api/bugs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok && data.ok) {
      return {
        ok: true,
        reportId: data.reportId,
        filename: data.filename,
        message: data.message || 'Bug report submitted successfully!',
      };
    }

    // If server returned a specific error message
    return {
      ok: false,
      error: data.error || `Failed to submit report (HTTP ${res.status}).`,
    };
  } catch (netErr: unknown) {
    // If backend is running on default port 2567 without proxy
    try {
      const fallbackUrl = 'http://localhost:2567/api/bugs';
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await fallbackRes.json().catch(() => ({}));
      if (fallbackRes.ok && data.ok) {
        return {
          ok: true,
          reportId: data.reportId,
          filename: data.filename,
          message: data.message || 'Bug report submitted successfully!',
        };
      }
    } catch {
      // Fallback failed
    }

    return {
      ok: false,
      error: 'Network error: could not reach the bug reporting server. Please check your connection or try again.',
    };
  }
}
