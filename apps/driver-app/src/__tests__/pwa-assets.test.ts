/**
 * @jest-environment node
 *
 * Verifies PWA static assets exist and have correct content.
 */

import fs from 'fs';
import path from 'path';

const publicDir = path.join(__dirname, '../../public');

describe('PWA assets', () => {
  describe('sw.js', () => {
    const swPath = path.join(publicDir, 'sw.js');

    it('exists at public/sw.js', () => {
      expect(fs.existsSync(swPath)).toBe(true);
    });

    it('registers an install event listener', () => {
      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain("addEventListener('install'");
    });

    it('registers an activate event listener', () => {
      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain("addEventListener('activate'");
    });

    it('registers a fetch event listener', () => {
      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain("addEventListener('fetch'");
    });

    it('uses cache-first strategy for static assets', () => {
      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toMatch(/cache.*first|caches\.match/i);
    });

    it('uses network-first strategy for API calls', () => {
      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toMatch(/\/api\//);
    });

    it('falls back to offline.html when network and cache fail', () => {
      const content = fs.readFileSync(swPath, 'utf-8');
      expect(content).toContain('offline.html');
    });
  });

  describe('offline.html', () => {
    const offlinePath = path.join(publicDir, 'offline.html');

    it('exists at public/offline.html', () => {
      expect(fs.existsSync(offlinePath)).toBe(true);
    });

    it('contains brand color #EA5B26', () => {
      const content = fs.readFileSync(offlinePath, 'utf-8');
      expect(content).toContain('#EA5B26');
    });

    it('has a Retry button that calls location.reload()', () => {
      const content = fs.readFileSync(offlinePath, 'utf-8');
      expect(content).toContain('location.reload()');
    });

    it('communicates that the user is offline', () => {
      const content = fs.readFileSync(offlinePath, 'utf-8');
      expect(content.toLowerCase()).toContain('offline');
    });

    it('uses only inline styles (no external CSS links)', () => {
      const content = fs.readFileSync(offlinePath, 'utf-8');
      // Should not contain <link rel="stylesheet"> pointing to external file
      expect(content).not.toMatch(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']https?:/i);
      expect(content).not.toMatch(/<link[^>]+href=["'][^"']+\.css["']/i);
    });
  });
});
