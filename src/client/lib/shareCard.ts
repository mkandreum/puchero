import { BY_ID, foodImg } from '../../shared/ingredients';
import type { Recipe } from '../../shared/types';

// Tarjeta de receta para compartir (1080×1350, formato de Instagram): mantequilla, titular en
// Instrument Serif, ingredientes con su ilustración y los pasos. Se dibuja en un canvas.

const W = 1080;
const H = 1350;

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

/** Parte un texto en líneas que caben en `max` px. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const w of text.split(/\s+/)) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > max && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export async function renderShareCard(r: Recipe): Promise<Blob> {
  await document.fonts?.ready;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#ffd84d';
  ctx.fillRect(0, 0, W, H);
  const ink = '#141210';
  const pad = 80;
  let y = 120;

  ctx.fillStyle = ink;
  ctx.font = "600 26px 'JetBrains Mono', monospace";
  ctx.fillText(`RECETA · PARA ${r.servings} ${r.servings === 1 ? 'PERSONA' : 'PERSONAS'} · ${r.minutes} MIN`, pad, y);

  y += 40;
  ctx.font = "italic 104px 'Instrument Serif', Georgia, serif";
  for (const line of wrap(ctx, r.title, W - pad * 2).slice(0, 3)) {
    y += 96;
    ctx.fillText(line, pad, y);
  }

  y += 70;
  ctx.font = "800 38px 'Bricolage Grotesque', system-ui, sans-serif";
  for (const line of wrap(ctx, r.tagline, W - pad * 2).slice(0, 2)) {
    ctx.fillText(line, pad, y);
    y += 48;
  }

  // Ingredientes en dos columnas, con ilustración
  y += 30;
  ctx.fillRect(pad, y, W - pad * 2, 4);
  y += 50;
  const imgs = await Promise.all(r.ingredients.map((id) => loadImg(foodImg(id))));
  const col = (W - pad * 2) / 2;
  r.ingredients.slice(0, 8).forEach((id, n) => {
    const x = pad + (n % 2) * col;
    const yy = y + Math.floor(n / 2) * 76;
    const img = imgs[n];
    if (img) ctx.drawImage(img, x, yy - 8, 60, 60);
    ctx.font = "800 32px 'Bricolage Grotesque', system-ui, sans-serif";
    ctx.fillText(r.amounts[n] ?? '', x + 76, yy + 22);
    ctx.font = "400 28px 'Bricolage Grotesque', system-ui, sans-serif";
    ctx.fillText(BY_ID[id]?.name ?? id, x + 76, yy + 54);
  });
  y += Math.ceil(Math.min(8, r.ingredients.length) / 2) * 76 + 30;

  // Pasos
  ctx.font = "400 30px 'Bricolage Grotesque', system-ui, sans-serif";
  r.steps.forEach((s, n) => {
    if (y > H - 170) return;
    ctx.font = "600 24px 'JetBrains Mono', monospace";
    ctx.fillText(String(n + 1).padStart(2, '0'), pad, y + 4);
    ctx.font = "400 30px 'Bricolage Grotesque', system-ui, sans-serif";
    for (const line of wrap(ctx, s, W - pad * 2 - 70).slice(0, 2)) {
      ctx.fillText(line, pad + 70, y);
      y += 40;
    }
    y += 14;
  });

  // Firma
  ctx.fillStyle = ink;
  ctx.fillRect(0, H - 120, W, 120);
  ctx.fillStyle = '#f5f1ea';
  ctx.font = "800 54px 'Bricolage Grotesque', system-ui, sans-serif";
  ctx.fillText('PUCHERO', pad, H - 45);
  ctx.fillStyle = '#d4ff4f';
  ctx.font = "italic 44px 'Instrument Serif', Georgia, serif";
  const sig = 'come bien sin drama.';
  ctx.fillText(sig, W - pad - ctx.measureText(sig).width, H - 48);

  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), 'image/png'));
}

/** Comparte la tarjeta con el menú del sistema; si no se puede, la descarga. */
export async function shareRecipe(r: Recipe): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderShareCard(r);
  const name = `puchero-${r.title.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').slice(0, 40)}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const text = `${r.title} — ${r.tagline}\nHecho con PUCHERO`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: r.title, text });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
