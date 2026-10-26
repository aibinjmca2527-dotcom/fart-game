import express from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { bugsRouter } from './bugs';

describe('Bug Reporting API (/api/bugs)', () => {
  let server: http.Server;
  let baseUrl: string;
  const bugsDir = path.resolve(process.cwd(), '..', 'bugs');
  const screenshotsDir = path.join(bugsDir, 'screenshots');

  beforeAll((done) => {
    const app = express();
    app.use(express.json({ limit: '10mb' }));
    app.use('/api/bugs', bugsRouter);

    server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
      done();
    });
  });

  afterAll((done) => {
    // Clean up test reports generated during test
    if (fs.existsSync(bugsDir)) {
      const files = fs.readdirSync(bugsDir);
      for (const f of files) {
        if (f.startsWith('bug-') && f.endsWith('.md')) {
          try { fs.unlinkSync(path.join(bugsDir, f)); } catch {}
        }
      }
    }
    if (fs.existsSync(screenshotsDir)) {
      const files = fs.readdirSync(screenshotsDir);
      for (const f of files) {
        if (f.startsWith('bug-')) {
          try { fs.unlinkSync(path.join(screenshotsDir, f)); } catch {}
        }
      }
    }

    server.close(done);
  });

  test('Rejects submission with empty description', async () => {
    const res = await fetch(`${baseUrl}/api/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: '   ' }),
    });

    const data = await res.json() as { ok: boolean; error: string };
    expect(res.status).toBe(400);
    expect(data.ok).toBe(false);
    expect(data.error).toMatch(/description/i);
  });

  test('Successfully saves a bug report without image', async () => {
    const res = await fetch(`${baseUrl}/api/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Test water flume collision bug',
        reporterName: 'Test Racer',
        reporterEmail: 'tester@example.com',
        environment: { platform: 'NodeTest', screen: '1920x1080' },
      }),
    });

    const data = await res.json() as { ok: boolean; reportId: string; filename: string };
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.reportId).toBeDefined();
    expect(data.filename).toMatch(/^bug-\d{8}-\d{3}\.md$/);

    // Verify file exists on disk
    const targetFile = path.join(bugsDir, data.filename);
    expect(fs.existsSync(targetFile)).toBe(true);

    const content = fs.readFileSync(targetFile, 'utf-8');
    expect(content).toContain('Test water flume collision bug');
    expect(content).toContain('Test Racer');
    expect(content).toContain('tester@example.com');
  });

  test('Successfully saves a bug report with screenshot', async () => {
    // 1x1 transparent PNG as base64
    const samplePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`${baseUrl}/api/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'Water visual glitch at checkpoint 2',
        image: samplePng,
        imageName: 'glitch.png',
        reporterName: 'Beta Tester',
      }),
    });

    const data = await res.json() as { ok: boolean; reportId: string; filename: string };
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);

    const targetFile = path.join(bugsDir, data.filename);
    expect(fs.existsSync(targetFile)).toBe(true);

    const content = fs.readFileSync(targetFile, 'utf-8');
    expect(content).toContain('Water visual glitch at checkpoint 2');
    expect(content).toContain(`screenshots/${data.reportId}.png`);

    const imgFile = path.join(screenshotsDir, `${data.reportId}.png`);
    expect(fs.existsSync(imgFile)).toBe(true);
  });

  test('Multiple sequential/concurrent submissions do NOT overwrite existing reports', async () => {
    const p1 = fetch(`${baseUrl}/api/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Concurrent Report 1' }),
    }).then(r => r.json() as Promise<{ ok: boolean; filename: string }>);

    const p2 = fetch(`${baseUrl}/api/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Concurrent Report 2' }),
    }).then(r => r.json() as Promise<{ ok: boolean; filename: string }>);

    const p3 = fetch(`${baseUrl}/api/bugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'Concurrent Report 3' }),
    }).then(r => r.json() as Promise<{ ok: boolean; filename: string }>);

    const [d1, d2, d3] = await Promise.all([p1, p2, p3]);

    expect(d1.ok).toBe(true);
    expect(d2.ok).toBe(true);
    expect(d3.ok).toBe(true);

    const filenames = new Set([d1.filename, d2.filename, d3.filename]);
    expect(filenames.size).toBe(3); // All 3 have unique filenames

    // All 3 files exist on disk
    expect(fs.existsSync(path.join(bugsDir, d1.filename))).toBe(true);
    expect(fs.existsSync(path.join(bugsDir, d2.filename))).toBe(true);
    expect(fs.existsSync(path.join(bugsDir, d3.filename))).toBe(true);
  });

  test('GET /api/bugs lists submitted reports', async () => {
    const res = await fetch(`${baseUrl}/api/bugs`);
    const data = await res.json() as { ok: boolean; count: number; reports: Array<unknown> };
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.count).toBeGreaterThan(0);
    expect(Array.isArray(data.reports)).toBe(true);
  });
});
