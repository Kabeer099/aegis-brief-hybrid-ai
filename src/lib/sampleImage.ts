/**
 * Generates a realistic synthetic field structural-inspection diagram PNG in-browser
 * using HTML5 Canvas so judges can test multimodal image + text Hybrid AI handoff
 * with a single click, even without hunting for a local JPEG/PNG file.
 */
export async function generateSampleInspectionImage(): Promise<{
  file: File;
  dataUrl: string;
}> {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable');
  }

  // Dark blueprint slate background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 960, 600);

  // Subtle engineering grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= 960; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }
  for (let y = 0; y <= 600; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(960, y);
    ctx.stroke();
  }

  // Concrete culvert slab & abutment wall
  ctx.fillStyle = '#475569';
  ctx.fillRect(110, 140, 740, 90);
  ctx.fillStyle = '#334155';
  ctx.fillRect(140, 230, 190, 240);
  ctx.fillRect(630, 230, 190, 240);

  // Culvert opening + water line
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(330, 230, 300, 240);
  ctx.fillStyle = '#0ea5e9';
  ctx.globalAlpha = 0.45;
  ctx.fillRect(330, 395, 300, 75);
  ctx.globalAlpha = 1;

  // Main water distribution pipe adjacent to left abutment
  ctx.fillStyle = '#64748b';
  ctx.fillRect(285, 255, 36, 215);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(285, 255, 36, 215);

  // Shear crack highlighted in crimson
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(215, 140);
  ctx.lineTo(232, 185);
  ctx.lineTo(260, 230);
  ctx.lineTo(278, 290);
  ctx.lineTo(298, 342);
  ctx.stroke();

  // Corroded anchor bolts (orange hazard rings)
  const bolts = [
    [175, 258],
    [215, 258],
    [255, 258],
  ];
  for (const [bx, by] of bolts) {
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(bx, by, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fed7aa';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Inspection callout badges
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.fillRect(380, 156, 360, 56);
  ctx.strokeRect(380, 156, 360, 56);
  ctx.fillStyle = '#fecaca';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('DEFECT A: 4.5mm DIAGONAL SHEAR CRACK', 396, 182);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '14px monospace';
  ctx.fillText('Abutment Wing Wall -> Main Water Pipe', 396, 202);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = '#f97316';
  ctx.fillRect(380, 258, 355, 56);
  ctx.strokeRect(380, 258, 355, 56);
  ctx.fillStyle = '#fed7aa';
  ctx.font = 'bold 17px monospace';
  ctx.fillText('DEFECT B: CORRODED ANCHOR BOLTS (x3)', 396, 284);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '14px monospace';
  ctx.fillText('Salt-water seepage at high-tide surge', 396, 304);

  // Header & Footer stamps
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('FIELD INSPECTION CAPTURE — CULVERT #GRID-2026-884', 44, 58);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '15px monospace';
  ctx.fillText('SECTOR 7-C COASTAL DRAIN  |  MAX AXLE LOAD UNVERIFIED  |  SYNTHETIC TEST IMAGE', 44, 86);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 15px monospace';
  ctx.fillText('WATER SURGE LEVEL: +0.62m ABOVE NOMINAL', 350, 442);

  const dataUrl = canvas.toDataURL('image/png');
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const file = new File([blob], 'field-culvert-inspection-884.png', { type: 'image/png' });
  return { file, dataUrl };
}
