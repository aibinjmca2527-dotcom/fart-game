// ============================================================
// Fun Together — Server-side Bug Reporting Route
// Securely stores bug reports as individual Markdown files in
// the GitHub repository (when GITHUB_TOKEN is provided) and/or
// local bugs/ directory, with optional screenshot attachments.
// ============================================================
import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

export const bugsRouter = Router();

// Locate project root bugs directory
function getBugsDir(): string {
  // If running from server folder: ../bugs
  const fromServer = path.resolve(process.cwd(), '..', 'bugs');
  // If running from repo root: ./bugs
  const fromRoot = path.resolve(process.cwd(), 'bugs');

  if (fs.existsSync(fromRoot)) return fromRoot;
  if (fs.existsSync(fromServer)) return fromServer;

  // Default to relative from current directory
  const target = path.resolve(process.cwd(), 'bugs');
  try {
    fs.mkdirSync(target, { recursive: true });
    return target;
  } catch {
    return fromServer;
  }
}

// Format current date as YYYYMMDD (e.g. 20261026)
function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Find next unique report ID and filename to prevent any overwrite
async function getNextReportInfo(
  bugsDir: string,
  dateStr: string,
  githubToken?: string,
  githubOwner?: string,
  githubRepo?: string
): Promise<{ reportId: string; filename: string; index: number }> {
  let maxIdx = 0;

  // 1. Check local directory
  if (fs.existsSync(bugsDir)) {
    try {
      const files = fs.readdirSync(bugsDir);
      const prefix = `bug-${dateStr}-`;
      for (const file of files) {
        if (file.startsWith(prefix) && file.endsWith('.md')) {
          const numPart = file.substring(prefix.length, file.length - 3).split('-')[0];
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxIdx) {
            maxIdx = num;
          }
        }
      }
    } catch (err) {
      console.warn('[Bugs] Error reading local bugs dir:', err);
    }
  }

  // 2. If GitHub token is present, also inspect GitHub contents for today's files
  if (githubToken && githubOwner && githubRepo) {
    try {
      const url = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/bugs`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'fun-together-bug-reporter',
        },
      });
      if (res.ok) {
        const items = (await res.json()) as Array<{ name: string }>;
        const prefix = `bug-${dateStr}-`;
        for (const item of items) {
          if (item.name.startsWith(prefix) && item.name.endsWith('.md')) {
            const numPart = item.name.substring(prefix.length, item.name.length - 3).split('-')[0];
            const num = parseInt(numPart, 10);
            if (!isNaN(num) && num > maxIdx) {
              maxIdx = num;
            }
          }
        }
      }
    } catch {
      // Ignore GitHub API read errors, fallback to local/timestamp uniqueness
    }
  }

  const nextIdx = maxIdx + 1;
  const numStr = String(nextIdx).padStart(3, '0');
  const reportId = `bug-${dateStr}-${numStr}`;
  const filename = `${reportId}.md`;

  return { reportId, filename, index: nextIdx };
}

// Commit a file directly to GitHub via REST API
async function commitToGitHub(options: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  contentBase64: string;
  commitMessage: string;
}): Promise<{ ok: boolean; status: number; data?: unknown; error?: string }> {
  const { token, owner, repo, branch, filePath, contentBase64, commitMessage } = options;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  // Check if file already exists to get its SHA (though we shouldn't overwrite)
  let sha: string | undefined;
  try {
    const getRes = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'fun-together-bug-reporter',
      },
    });
    if (getRes.ok) {
      const json = (await getRes.json()) as { sha?: string };
      sha = json.sha;
    }
  } catch {
    // New file
  }

  const body: Record<string, unknown> = {
    message: commitMessage,
    content: contentBase64,
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'fun-together-bug-reporter',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    return { ok: false, status: res.status, error: errorText };
  }

  const data = await res.json();
  return { ok: true, status: res.status, data };
}

// POST /api/bugs
bugsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const {
      description,
      image, // data URL or base64 string (optional)
      imageName,
      reporterName,
      reporterEmail,
      environment,
    } = req.body;

    // 1. Validation: Description cannot be empty
    if (!description || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({
        ok: false,
        error: 'Bug description is required and cannot be empty.',
      });
      return;
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length > 10000) {
      res.status(400).json({
        ok: false,
        error: 'Bug description exceeds maximum allowed length of 10,000 characters.',
      });
      return;
    }

    const dateStr = getDateString();
    const submissionTime = new Date().toISOString();
    const bugsDir = getBugsDir();

    // GitHub configuration from server-side environment variables
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || 'aibinjmca2527-dotcom';
    const githubRepo = process.env.GITHUB_REPO || 'fart-game';
    const githubBranch = process.env.GITHUB_BRANCH || 'main';

    // 2. Generate collision-free report ID and filename
    let { reportId, filename, index } = await getNextReportInfo(
      bugsDir,
      dateStr,
      githubToken,
      githubOwner,
      githubRepo
    );

    // Ensure directory exists locally
    const screenshotsDir = path.join(bugsDir, 'screenshots');
    try {
      fs.mkdirSync(bugsDir, { recursive: true });
      fs.mkdirSync(screenshotsDir, { recursive: true });
    } catch {
      // Ignore if exists
    }

    // 3. Process optional screenshot
    let screenshotFilename: string | null = null;
    let screenshotBuffer: Buffer | null = null;
    let screenshotBase64Raw: string | null = null;

    if (image && typeof image === 'string') {
      let base64Data = image;
      let ext = 'png';

      // Parse data URL prefix if present: data:image/png;base64,...
      const match = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
        base64Data = match[2];
      }

      // Safe image extension whitelist
      if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
        ext = 'png';
      }

      try {
        screenshotBuffer = Buffer.from(base64Data, 'base64');
        screenshotBase64Raw = base64Data;

        // Size check (max 5MB)
        if (screenshotBuffer.length > 5 * 1024 * 1024) {
          res.status(400).json({
            ok: false,
            error: 'Screenshot image size exceeds 5MB limit.',
          });
          return;
        }

        screenshotFilename = `${reportId}.${ext}`;
      } catch (err) {
        console.warn('[Bugs] Failed to decode base64 image:', err);
      }
    }

    // 4. Build Markdown Content
    const reporterDisplay = reporterName?.trim() || 'Anonymous Player';
    const reporterContact = reporterEmail?.trim() ? ` <${reporterEmail.trim()}>` : '';
    const envInfo = environment && typeof environment === 'object' ? environment : {};

    let markdown = `# 🐛 Bug Report: ${reportId}\n\n`;
    markdown += `| Field | Value |\n`;
    markdown += `|---|---|\n`;
    markdown += `| **Report ID** | \`${reportId}\` |\n`;
    markdown += `| **Date & Time** | ${submissionTime} |\n`;
    markdown += `| **Reported By** | ${reporterDisplay}${reporterContact} |\n`;
    markdown += `| **Status** | 🟢 Open |\n\n`;

    markdown += `## 📝 Description\n\n${trimmedDesc}\n\n`;

    markdown += `## 🖥️ Environment\n\n`;
    markdown += `- **URL / View:** ${envInfo.url || 'Dashboard / Game'}\n`;
    markdown += `- **Platform:** ${envInfo.platform || 'Unknown'}\n`;
    markdown += `- **User Agent:** \`${envInfo.userAgent || 'Not supplied'}\`\n`;
    markdown += `- **Screen Resolution:** ${envInfo.screen || 'Not supplied'}\n\n`;

    if (screenshotFilename) {
      markdown += `## 📷 Attached Screenshot\n\n`;
      markdown += `![${imageName || 'Bug Screenshot'}](screenshots/${screenshotFilename})\n\n`;
    } else {
      markdown += `## 📷 Attached Screenshot\n\n*No screenshot was attached with this report.*\n\n`;
    }

    markdown += `---\n*Generated automatically by Fun Together Bug Reporting System.*\n`;

    // 5. Store locally with exclusive write to guarantee NEVER overwriting existing reports
    let localSaved = false;
    let localFilePath = path.join(bugsDir, filename);

    // Collision check loop for local filesystem
    while (fs.existsSync(localFilePath)) {
      index++;
      reportId = `bug-${dateStr}-${String(index).padStart(3, '0')}`;
      filename = `${reportId}.md`;
      localFilePath = path.join(bugsDir, filename);
      if (screenshotFilename) {
        const ext = path.extname(screenshotFilename);
        screenshotFilename = `${reportId}${ext}`;
      }
    }

    try {
      // Save screenshot locally
      if (screenshotFilename && screenshotBuffer) {
        const localImgPath = path.join(screenshotsDir, screenshotFilename);
        fs.writeFileSync(localImgPath, screenshotBuffer);
      }

      // Save markdown report locally
      fs.writeFileSync(localFilePath, markdown, { flag: 'wx' });
      localSaved = true;
      console.log(`[Bugs] Successfully saved bug report locally to ${localFilePath}`);
    } catch (fsErr) {
      console.error('[Bugs] Local file write warning:', fsErr);
    }

    // 6. Commit to GitHub Repository if GITHUB_TOKEN is available
    let githubSaved = false;
    if (githubToken) {
      try {
        // If screenshot exists, commit screenshot to bugs/screenshots/
        if (screenshotFilename && screenshotBase64Raw) {
          const imgPath = `bugs/screenshots/${screenshotFilename}`;
          await commitToGitHub({
            token: githubToken,
            owner: githubOwner,
            repo: githubRepo,
            branch: githubBranch,
            filePath: imgPath,
            contentBase64: screenshotBase64Raw,
            commitMessage: `Add screenshot for bug report ${reportId}`,
          });
        }

        // Commit markdown report to bugs/
        const mdPath = `bugs/${filename}`;
        const mdBase64 = Buffer.from(markdown, 'utf-8').toString('base64');
        const ghRes = await commitToGitHub({
          token: githubToken,
          owner: githubOwner,
          repo: githubRepo,
          branch: githubBranch,
          filePath: mdPath,
          contentBase64: mdBase64,
          commitMessage: `Add bug report ${filename}`,
        });

        if (ghRes.ok) {
          githubSaved = true;
          console.log(`[Bugs] Successfully committed ${filename} to GitHub repo ${githubOwner}/${githubRepo}`);
        } else {
          console.warn('[Bugs] GitHub commit response not ok:', ghRes.error);
        }
      } catch (ghErr) {
        console.error('[Bugs] GitHub commit error:', ghErr);
      }
    }

    // Check that at least one storage medium succeeded
    if (!localSaved && !githubSaved) {
      res.status(500).json({
        ok: false,
        error: 'Failed to write bug report to repository storage. Please try again.',
      });
      return;
    }

    res.status(200).json({
      ok: true,
      reportId,
      filename,
      localSaved,
      githubSaved,
      message: 'Bug report submitted successfully! Thank you for helping improve Fun Together.',
    });
  } catch (err: unknown) {
    console.error('[Bugs] Unexpected error handling bug report:', err);
    res.status(500).json({
      ok: false,
      error: 'An unexpected server error occurred while processing the bug report.',
    });
  }
});

// GET /api/bugs - List submitted reports
bugsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const bugsDir = getBugsDir();
    if (!fs.existsSync(bugsDir)) {
      res.json({ ok: true, count: 0, reports: [] });
      return;
    }

    const files = fs.readdirSync(bugsDir).filter((f) => f.endsWith('.md') && f !== 'README.md');
    const reports = files.map((file) => {
      const fullPath = path.join(bugsDir, file);
      const stat = fs.statSync(fullPath);
      return {
        filename: file,
        sizeBytes: stat.size,
        createdAt: stat.birthtime,
        modifiedAt: stat.mtime,
      };
    });

    res.json({
      ok: true,
      count: reports.length,
      reports,
    });
  } catch (err: unknown) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});
