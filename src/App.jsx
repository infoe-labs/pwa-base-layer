import { useEffect, useState } from 'react';
import { appConfig } from '../app.config.js';
import { createIndexedStore, createLocalStore } from './lib/storage.js';
import { subscribeInstall, promptInstall } from './lib/install.js';
import { pwa } from './lib/pwa.js';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const scope = { appId: appConfig.appId, basePath: import.meta.env.BASE_URL, namespace: 'demo', version: 1 };
const notes = createIndexedStore(scope);

export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const [installation, setInstallation] = useState({ canPrompt: false, installed: false });
  const [status, setStatus] = useState('');
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(true);
  const [, redraw] = useState(0);
  useEffect(() => {
    const connection = () => setOnline(navigator.onLine);
    const refresh = () => redraw(count => count + 1);
    window.addEventListener('online', connection);
    window.addEventListener('offline', connection);
    pwa.events.addEventListener('change', refresh);
    const unsubscribe = subscribeInstall(setInstallation);
    let active = true;
    const prune = () => Promise.all([notes.prune(), Promise.resolve().then(() => createLocalStore(scope).prune())]);
    (async () => {
      try {
        await prune();
        const value = await notes.get('note') ?? '';
        if (active) { setNote(value); setSaved(value); }
      } catch { if (active) setStatus('Local storage is unavailable. You can still use the app shell.'); }
      finally { if (active) setBusy(false); }
    })();
    const cleanup = window.setInterval(() => { prune().catch(() => {}); }, 60_000);
    return () => {
      active = false; clearInterval(cleanup); unsubscribe();
      window.removeEventListener('online', connection); window.removeEventListener('offline', connection);
      pwa.events.removeEventListener('change', refresh);
    };
  }, []);
  async function save(event) {
    event.preventDefault(); setBusy(true);
    try {
      await notes.set('note', note, { ttlMs: 24 * 60 * 60 * 1000 });
      setSaved(note); setStatus('Saved on this device for 24 hours.');
    } catch { setStatus('Could not save. Storage may be full or unavailable. Your text is still here.'); }
    finally { setBusy(false); }
  }
  async function clear() {
    setBusy(true);
    try {
      await notes.clear(); createLocalStore(scope).clear();
      setNote(''); setSaved(''); setStatus('Demo data deleted. Other namespaces and offline app files are unchanged.');
    } catch { setStatus('Could not complete deletion. Please retry.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto min-h-dvh max-w-5xl pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] pt-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:pl-[max(2rem,env(safe-area-inset-left))] sm:pr-[max(2rem,env(safe-area-inset-right))] sm:pt-14">
    <header className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b pb-5">
      <a className="text-sm font-semibold tracking-wide" href={import.meta.env.BASE_URL}>{appConfig.name}</a>
      <div className="flex flex-wrap gap-2" aria-live="polite">
        <Badge variant="secondary">{online ? 'Online' : 'Offline'}</Badge>
        <Badge variant="outline">{!pwa.supported ? 'Offline unavailable' : pwa.ready ? 'Offline ready' : 'Preparing offline access'}</Badge>
      </div>
    </header>
    <section className="mb-10 max-w-2xl">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">The foundation, ready to build on</p>
      <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">Start connected.<br />Keep going offline.</h1>
      <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">An installable app shell with local storage, a responsive interface, and privacy built into its defaults. Make it your own.</p>
    </section>
    {pwa.update && <section className="mb-6 rounded-xl border bg-accent p-5" aria-label="App update">
      <p className="mb-3">An app update is ready. Save or delete your draft before reloading.</p>
      <Button disabled={note !== saved || busy} onClick={() => pwa.applyUpdate().catch(() => setStatus('Update failed. Please retry.'))}>Update and reload</Button>
    </section>}
    {pwa.error && <p role="alert" className="mb-6">Offline setup failed. Reconnect and reload to retry.</p>}
    <div className="grid items-start gap-6 md:grid-cols-[1.2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Try a local note</CardTitle>
          <CardDescription>A small storage example. Your note stays in this browser and expires after 24 hours.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="space-y-4">
            <label className="block text-sm font-medium" htmlFor="note">Your note</label>
            <Textarea id="note" value={note} onChange={event => setNote(event.target.value)} placeholder="Something to keep for later…" maxLength={10000} className="min-h-40 resize-y text-base" disabled={busy} />
            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={busy}>Save on device</Button>
              <Button type="button" variant="outline" disabled={busy} onClick={clear}>Delete demo data</Button>
            </div>
            <p className="min-h-12 text-sm leading-6 text-muted-foreground" role="status">{status || 'No account, analytics, or server sync. Avoid storing sensitive information on shared devices.'}</p>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Make room on your home screen</CardTitle>
            <CardDescription>Open it like an app. Use it after your first successful online visit, even without a connection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {installation.installed ? <Badge variant="secondary">Running as an installed app</Badge> : <>
              {installation.canPrompt && <Button onClick={() => promptInstall().catch(() => setStatus('Installation was unavailable. Use the browser menu.'))}>Install app</Button>}
              <details className="rounded-lg border p-4 text-sm leading-6" open>
                <summary className="cursor-pointer font-medium">Add to Home Screen</summary>
                <ol className="mt-3 list-inside list-decimal space-y-3 text-muted-foreground">
                  <li><strong className="text-foreground">iPhone / iPad:</strong> open in Safari, tap Share, then Add to Home Screen. If shown, enable Open as Web App, then tap Add.</li>
                  <li><strong className="text-foreground">Android:</strong> use Install app above when available, or open the browser menu and choose Install app or Add to Home screen.</li>
                </ol>
                <p className="mt-3 text-muted-foreground">Menu wording and installation availability depend on your browser. If opened inside another app, open this page in Safari or Chrome first.</p>
              </details>
            </>}
          </CardContent>
        </Card>
        <div className="px-1 text-sm leading-6 text-muted-foreground">
          <h2 className="mb-2 font-semibold text-foreground">A small, deliberate footprint</h2>
          <p>Only the app files are cached. The note uses its own storage namespace. No third-party scripts, fonts, telemetry, or automatic permission requests.</p>
        </div>
      </div>
    </div>
    <footer className="mt-12 border-t pt-5 text-xs leading-6 text-muted-foreground">Built for reuse · React + Tailwind CSS + shadcn/ui · Static hosting ready</footer>
  </main>;
}
