// ============================================================
// Vercel Serverless Function: /api/bugs
// Handles bug report submission in deployed Vercel environments
// Commits markdown report + optional screenshot to GitHub repo
// ============================================================
import type { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
  body: any;
  query: Record<string, string>;
  method?: string;
}

interface VercelResponse extends ServerResponse {
  status: (code: number) => VercelResponse;
  json: (body: any) => void;
  send: (body: any) => void;
}

function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

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
    const errText = await res.text();
    return { ok: false, status: res.status, error: errText };
  }
  return { ok: true, status: res.status, data: await res.json() };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const {
      description,
      image,
      imageName,
      reporterName,
      reporterEmail,
      environment,
    } = req.body || {};

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

    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_OWNER || 'aibinjmca2527-dotcom';
    const githubRepo = process.env.GITHUB_REPO || 'fart-game';
    const githubBranch = process.env.GITHUB_BRANCH || 'main';

    let maxIdx = 0;
    if (githubToken) {
      try {
        const listUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/bugs`;
        const listRes = await fetch(listUrl, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'fun-together-bug-reporter',
          },
        });
        if (listRes.ok) {
          const items = (await listRes.json()) as Array<{ name: string }>;
          const prefix = `bug-${dateStr}-`;
          for (const item of items) {
            if (item.name.startsWith(prefix) && item.name.endsWith('.md')) {
              const numPart = item.name.substring(prefix.length, item.name.length - 3).split('-')[0];
              const num = parseInt(numPart, 10);
              if (!isNaN(num) && num > maxIdx) maxIdx = num;
            }
          }
        }
      } catch {
        // Fallback
      }
    }

    const nextIdx = maxIdx + 1;
    const reportId = `bug-${dateStr}-${String(nextIdx).padStart(3, '0')}`;
    const filename = `${reportId}.md`;

    // Screenshot processing
    let screenshotFilename: string | null = null;
    let screenshotBase64Raw: string | null = null;

    if (image && typeof image === 'string') {
      let base64Data = image;
      let ext = 'png';
      const match = image.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      if (match) {
        ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
        base64Data = match[2];
      }
      if (!['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) ext = 'png';
      screenshotBase64Raw = base64Data;
      screenshotFilename = `${reportId}.${ext}`;
    }

    // Markdown content
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

    if (githubToken) {
      if (screenshotFilename && screenshotBase64Raw) {
        await commitToGitHub({
          token: githubToken,
          owner: githubOwner,
          repo: githubRepo,
          branch: githubBranch,
          filePath: `bugs/screenshots/${screenshotFilename}`,
          contentBase64: screenshotBase64Raw,
          commitMessage: `Add screenshot for ${reportId}`,
        });
      }

      const mdBase64 = Buffer.from(markdown, 'utf-8').toString('base64');
      const ghRes = await commitToGitHub({
        token: githubToken,
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
        filePath: `bugs/${filename}`,
        contentBase64: mdBase64,
        commitMessage: `Add bug report ${filename}`,
      });

      if (!ghRes.ok) {
        res.status(500).json({
          ok: false,
          error: `GitHub repository write failed: ${ghRes.error}`,
        });
        return;
      }

      res.status(200).json({
        ok: true,
        reportId,
        filename,
        githubSaved: true,
        message: 'Bug report submitted and saved to GitHub repository successfully!',
      });
      return;
    }

    // If GITHUB_TOKEN is not configured in Vercel
    res.status(200).json({
      ok: true,
      reportId,
      filename,
      message: 'Bug report received. Configure GITHUB_TOKEN in environment to commit directly to GitHub repository.',
    });
  } catch (err: unknown) {
    res.status(500).json({
      ok: false,
      error: 'An unexpected server error occurred.',
    });
  }
}
