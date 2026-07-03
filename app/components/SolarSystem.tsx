"use client";

import { useEffect, useRef, useState } from "react";
import { Strategy } from "../types";

interface Props {
  core: Strategy;
  satellites: Strategy[];
}

interface SatelliteState {
  strategy: Strategy;
  angle: number;
  orbitRadius: number;
  size: number;
  speed: number;
  direction: 1 | -1;
  planetType: number;
  _sx?: number;
  _sy?: number;
}

// Glow color per planet type (cycling through satellites)
const ORBIT_GLOW = [
  "#e8a95a", "#4fb8c8", "#5599ee", "#cc5533",
  "#ddaa22", "#aabbdd", "#ddcc88", "#9966dd",
];

function getSatelliteSize(weight: number, maxWeight: number): number {
  return 22 + ((weight / Math.max(maxWeight, 1)) * 46);
}

function getSpeed(ret: number): number {
  return 0.000225 + Math.min(Math.abs(ret) / 20, 1) * 0.0006;
}

function formatReturn(ret: number): string {
  return (ret >= 0 ? "+" : "") + ret.toFixed(2) + "%";
}

function pseudoRand(seed: number, max = 1): number {
  const s = Math.sin(seed * 9301 + 49297) * 233280;
  return (s - Math.floor(s)) * max;
}

// ── Planet: Gas Giant (Jupiter) ─────────────────────────────
function drawGasGiant(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, seed: number) {
  const bg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
  bg.addColorStop(0, "#f5d89a");
  bg.addColorStop(0.4, "#d4956a");
  bg.addColorStop(0.75, "#b8663f");
  bg.addColorStop(1, "#7a3820");
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  const bands = [
    { offset: -0.65, h: 0.12, color: "rgba(90,45,20,0.6)" },
    { offset: -0.40, h: 0.10, color: "rgba(200,160,100,0.4)" },
    { offset: -0.15, h: 0.14, color: "rgba(80,35,15,0.55)" },
    { offset: 0.08,  h: 0.10, color: "rgba(180,140,80,0.35)" },
    { offset: 0.28,  h: 0.13, color: "rgba(100,50,25,0.5)" },
    { offset: 0.50,  h: 0.09, color: "rgba(220,180,110,0.3)" },
    { offset: 0.68,  h: 0.10, color: "rgba(70,30,10,0.45)" },
  ];
  bands.forEach(b => {
    const wave = Math.sin(time * 0.0003 + seed * 0.5) * r * 0.03;
    ctx.fillStyle = b.color;
    ctx.fillRect(x - r, y + b.offset * r - (b.h * r) + wave, r * 2, b.h * r * 2);
  });

  // Great Red Spot
  const sx = x + r * 0.3;
  const sy = y + r * 0.12;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 0.22);
  sg.addColorStop(0, "rgba(180,60,30,0.9)");
  sg.addColorStop(0.6, "rgba(150,50,25,0.7)");
  sg.addColorStop(1, "rgba(120,40,20,0)");
  ctx.fillStyle = sg;
  ctx.save();
  ctx.scale(1, 0.55);
  ctx.beginPath();
  ctx.arc(sx, sy / 0.55, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// ── Planet: Ice Giant (Neptune) ──────────────────────────────
function drawIceGiant(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number) {
  const bg = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.05, x, y, r);
  bg.addColorStop(0, "#90e0f8");
  bg.addColorStop(0.35, "#1e90c8");
  bg.addColorStop(0.7, "#0a4880");
  bg.addColorStop(1, "#052038");
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  [-0.5, -0.2, 0.1, 0.4, 0.65].forEach((oy, i) => {
    const wave = Math.sin(time * 0.0004 + i * 1.2) * r * 0.04;
    ctx.fillStyle = `rgba(100,200,240,${0.08 + i * 0.02})`;
    ctx.fillRect(x - r, y + oy * r - r * 0.04 + wave, r * 2, r * 0.08);
  });

  for (let i = 0; i < 4; i++) {
    const wy = y + (-0.6 + i * 0.32) * r;
    const shift = Math.sin(time * 0.0005 + i) * r * 0.15;
    ctx.strokeStyle = `rgba(200,240,255,${0.12 + i * 0.04})`;
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    ctx.moveTo(x - r + shift, wy);
    ctx.lineTo(x + r + shift, wy);
    ctx.stroke();
  }
}

// ── Planet: Terrestrial (Earth) ──────────────────────────────
function drawTerrestrial(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number) {
  const bg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
  bg.addColorStop(0, "#5ab4f0");
  bg.addColorStop(0.5, "#1e6fbb");
  bg.addColorStop(1, "#0d3d6e");
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  const continents = [
    { cx: 0.15, cy: -0.2, size: 0.35, rot: 0.3 },
    { cx: -0.35, cy: 0.2, size: 0.28, rot: -0.5 },
    { cx: 0.3, cy: 0.4, size: 0.22, rot: 0.8 },
  ];
  continents.forEach(c => {
    ctx.save();
    ctx.translate(x + c.cx * r, y + c.cy * r);
    ctx.rotate(c.rot);
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, c.size * r);
    cg.addColorStop(0, "rgba(80,140,60,0.9)");
    cg.addColorStop(0.6, "rgba(100,120,50,0.7)");
    cg.addColorStop(1, "rgba(60,80,40,0)");
    ctx.fillStyle = cg;
    ctx.save();
    ctx.scale(1, 0.7);
    ctx.beginPath();
    ctx.arc(0, 0, c.size * r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  });

  // Polar ice cap
  const iceg = ctx.createRadialGradient(x, y - r * 0.72, 0, x, y - r * 0.72, r * 0.42);
  iceg.addColorStop(0, "rgba(255,255,255,0.95)");
  iceg.addColorStop(0.5, "rgba(230,245,255,0.6)");
  iceg.addColorStop(1, "rgba(200,230,255,0)");
  ctx.fillStyle = iceg;
  ctx.fillRect(x - r, y - r, r * 2, r * 0.6);

  // Clouds
  for (let i = 0; i < 5; i++) {
    const cloudY = y + (-0.6 + i * 0.28) * r;
    const drift = Math.sin(time * 0.0003 + i * 0.8) * r * 0.1;
    ctx.strokeStyle = `rgba(255,255,255,${0.15 + pseudoRand(i * 7) * 0.2})`;
    ctx.lineWidth = r * (0.05 + pseudoRand(i * 7 + 1) * 0.05);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7 + drift, cloudY);
    ctx.lineTo(x + r * (0.4 + pseudoRand(i * 7 + 2) * 0.4) + drift, cloudY);
    ctx.stroke();
  }
}

// ── Planet: Desert (Mars) ────────────────────────────────────
function drawDesert(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number, seed: number) {
  const bg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.05, x, y, r);
  bg.addColorStop(0, "#e8916a");
  bg.addColorStop(0.4, "#c05f3a");
  bg.addColorStop(0.75, "#8f3820");
  bg.addColorStop(1, "#5a1e0a");
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  for (let i = 0; i < 3; i++) {
    const px = x + (pseudoRand(seed * 4 + i) - 0.5) * r * 1.1;
    const py = y + (pseudoRand(seed * 4 + i + 1) - 0.5) * r * 0.9;
    const pr = r * (0.15 + pseudoRand(seed * 4 + i + 2) * 0.2);
    const dg = ctx.createRadialGradient(px, py, 0, px, py, pr);
    dg.addColorStop(0, "rgba(60,25,10,0.6)");
    dg.addColorStop(1, "rgba(60,25,10,0)");
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }

  const dustOffset = Math.sin(time * 0.0004 + seed) * r * 0.05;
  ctx.strokeStyle = "rgba(220,140,80,0.2)";
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.arc(x + dustOffset, y + r * 0.3, r * 0.4, 0.3, 2.5);
  ctx.stroke();

  // Polar cap
  const iceg2 = ctx.createRadialGradient(x, y - r * 0.8, 0, x, y - r * 0.8, r * 0.35);
  iceg2.addColorStop(0, "rgba(255,245,235,0.9)");
  iceg2.addColorStop(1, "rgba(255,245,235,0)");
  ctx.fillStyle = iceg2;
  ctx.fillRect(x - r, y - r, r * 2, r * 0.45);
}

// ── Planet: Volcanic (Io) ─────────────────────────────────────
function drawVolcanic(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number) {
  const bg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.1, x, y, r);
  bg.addColorStop(0, "#f5e060");
  bg.addColorStop(0.45, "#d4900a");
  bg.addColorStop(0.75, "#8c4a00");
  bg.addColorStop(1, "#3a1800");
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  const calderas = [
    { ox: 0.3, oy: -0.25, size: 0.14 },
    { ox: -0.35, oy: 0.15, size: 0.11 },
    { ox: 0.1, oy: 0.45, size: 0.09 },
    { ox: -0.2, oy: -0.5, size: 0.07 },
  ];
  calderas.forEach(c => {
    const cg = ctx.createRadialGradient(x + c.ox * r, y + c.oy * r, 0, x + c.ox * r, y + c.oy * r, c.size * r);
    cg.addColorStop(0, "rgba(20,10,0,0.95)");
    cg.addColorStop(0.6, "rgba(80,30,0,0.7)");
    cg.addColorStop(1, "rgba(80,30,0,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x + c.ox * r, y + c.oy * r, c.size * r, 0, Math.PI * 2);
    ctx.fill();
  });

  const pulse = Math.sin(time * 0.002) * 0.5 + 0.5;
  ctx.strokeStyle = `rgba(255,${100 + pulse * 60},0,${0.6 + pulse * 0.3})`;
  ctx.lineWidth = r * 0.035;
  ctx.lineCap = "round";
  [[0.3, -0.25, 0.1, 0.1], [-0.35, 0.15, -0.1, 0.35]].forEach(([x1, y1, x2, y2]) => {
    ctx.beginPath();
    ctx.moveTo(x + x1 * r, y + y1 * r);
    ctx.lineTo(x + x2 * r, y + y2 * r);
    ctx.stroke();
  });
}

// ── Planet: Ice World (Enceladus) ─────────────────────────────
function drawIceWorld(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, _time: number, seed: number) {
  const bg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.05, x, y, r);
  bg.addColorStop(0, "#f0f6ff");
  bg.addColorStop(0.4, "#b8d4f0");
  bg.addColorStop(0.7, "#7aaace");
  bg.addColorStop(1, "#3a6088");
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  for (let i = 0; i < 5; i++) {
    const cx = x + (pseudoRand(seed * 5 + i * 2) - 0.5) * r * 1.4;
    const cy = y + (pseudoRand(seed * 5 + i * 2 + 1) - 0.5) * r * 1.4;
    const cr = r * (0.06 + pseudoRand(seed * 5 + i * 2 + 2) * 0.12);
    ctx.strokeStyle = "rgba(80,110,150,0.5)";
    ctx.lineWidth = cr * 0.2;
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (let i = 0; i < 4; i++) {
    const startY = y + (-0.7 + i * 0.38) * r;
    ctx.strokeStyle = "rgba(100,160,220,0.35)";
    ctx.lineWidth = r * 0.025;
    ctx.beginPath();
    ctx.moveTo(x - r * 0.8, startY + Math.sin(i) * r * 0.1);
    ctx.quadraticCurveTo(x, startY + Math.cos(i * 2) * r * 0.15, x + r * 0.8, startY + Math.sin(i + 1) * r * 0.1);
    ctx.stroke();
  }
}

// ── Planet: Ringed (Saturn) ───────────────────────────────────
function drawRingedPlanet(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const bg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.1, x, y, r);
  bg.addColorStop(0, "#f8e8b8");
  bg.addColorStop(0.4, "#d4b870");
  bg.addColorStop(0.75, "#a88040");
  bg.addColorStop(1, "#6a4a18");
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  [-0.3, 0.0, 0.3].forEach((oy, i) => {
    ctx.fillStyle = `rgba(180,140,60,${0.2 + i * 0.05})`;
    ctx.fillRect(x - r, y + oy * r - r * 0.055, r * 2, r * 0.11);
  });
}

// ── Planet: Storm Giant (Purple) ─────────────────────────────
function drawStormGiant(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, time: number) {
  const bg = ctx.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.05, x, y, r);
  bg.addColorStop(0, "#c8a0f8");
  bg.addColorStop(0.4, "#8855cc");
  bg.addColorStop(0.75, "#4a2880");
  bg.addColorStop(1, "#1e0a38");
  ctx.fillStyle = bg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);

  for (let i = 0; i < 5; i++) {
    const swY = y + (-0.7 + i * 0.36) * r;
    const swirl = Math.sin(time * 0.0004 + i * 0.7) * r * 0.08;
    ctx.strokeStyle = `rgba(200,170,255,${0.12 + i * 0.03})`;
    ctx.lineWidth = r * (0.04 + pseudoRand(i * 3) * 0.04);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - r + swirl, swY);
    ctx.quadraticCurveTo(x + swirl * 0.3, swY + r * 0.04, x + r + swirl * 0.5, swY - r * 0.02);
    ctx.stroke();
  }

  const sg2 = ctx.createRadialGradient(x - r * 0.2, y - r * 0.15, 0, x - r * 0.2, y - r * 0.15, r * 0.2);
  sg2.addColorStop(0, "rgba(15,5,30,0.8)");
  sg2.addColorStop(1, "rgba(15,5,30,0)");
  ctx.fillStyle = sg2;
  ctx.beginPath();
  ctx.arc(x - r * 0.2, y - r * 0.15, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

// ── Shadow overlay ─────────────────────────────────────────────
function drawPlanetShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, lightAngle: number) {
  const sdx = -Math.cos(lightAngle);
  const sdy = -Math.sin(lightAngle);
  const offset = r * 0.35;
  const sg = ctx.createRadialGradient(
    x + sdx * offset, y + sdy * offset, r * 0.15,
    x + sdx * offset, y + sdy * offset, r * 1.15
  );
  sg.addColorStop(0, "rgba(0,0,0,0)");
  sg.addColorStop(0.35, "rgba(0,0,10,0.15)");
  sg.addColorStop(0.65, "rgba(0,0,20,0.55)");
  sg.addColorStop(1, "rgba(0,0,30,0.88)");
  ctx.fillStyle = sg;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// ── Atmospheric rim glow ───────────────────────────────────────
function drawAtmosphericRim(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, lightAngle: number) {
  const rimGrad = ctx.createRadialGradient(x, y, r * 0.88, x, y, r * 1.12);
  rimGrad.addColorStop(0, "rgba(0,0,0,0)");
  rimGrad.addColorStop(0.5, color + "30");
  rimGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rimGrad;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.12, 0, Math.PI * 2);
  ctx.fill();

  const litX = x + Math.cos(lightAngle) * r * 0.05;
  const litY = y + Math.sin(lightAngle) * r * 0.05;
  const crescent = ctx.createRadialGradient(litX, litY, r * 0.82, litX, litY, r * 1.05);
  crescent.addColorStop(0, "rgba(0,0,0,0)");
  crescent.addColorStop(0.5, color + "55");
  crescent.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = crescent;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.05, 0, Math.PI * 2);
  ctx.fill();
}

// ── Saturn rings ───────────────────────────────────────────────
function drawRings(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, half: "front" | "back") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, 0.28);
  const startA = half === "back" ? Math.PI : 0;
  const endA   = half === "back" ? Math.PI * 2 : Math.PI;
  const alphas = half === "back" ? [0.55, 0.30, 0.45, 0.18] : [0.70, 0.45, 0.60, 0.25];
  for (let i = 3; i >= 0; i--) {
    const inner = r * (1.45 + i * 0.22);
    const outer = r * (1.65 + i * 0.22);
    const rg = ctx.createLinearGradient(-outer, 0, outer, 0);
    rg.addColorStop(0,   `rgba(200,175,120,0)`);
    rg.addColorStop(0.1, `rgba(200,175,120,${alphas[i] * 0.6})`);
    rg.addColorStop(0.5, `rgba(230,210,160,${alphas[i]})`);
    rg.addColorStop(0.9, `rgba(200,175,120,${alphas[i] * 0.6})`);
    rg.addColorStop(1,   `rgba(200,175,120,0)`);
    ctx.strokeStyle = rg;
    ctx.lineWidth = outer - inner;
    ctx.beginPath();
    ctx.arc(0, 0, (inner + outer) / 2, startA, endA);
    ctx.stroke();
  }
  ctx.restore();
}

// ── Full planet render ─────────────────────────────────────────
function drawPlanet(
  ctx: CanvasRenderingContext2D,
  sx: number, sy: number, r: number,
  planetType: number,
  sunX: number, sunY: number,
  time: number,
  seed: number
) {
  const lightAngle = Math.atan2(sunY - sy, sunX - sx);

  if (planetType === 6) drawRings(ctx, sx, sy, r, "back");

  ctx.save();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.clip();
  switch (planetType) {
    case 0: drawGasGiant(ctx, sx, sy, r, time, seed); break;
    case 1: drawIceGiant(ctx, sx, sy, r, time); break;
    case 2: drawTerrestrial(ctx, sx, sy, r, time); break;
    case 3: drawDesert(ctx, sx, sy, r, time, seed); break;
    case 4: drawVolcanic(ctx, sx, sy, r, time); break;
    case 5: drawIceWorld(ctx, sx, sy, r, time, seed); break;
    case 6: drawRingedPlanet(ctx, sx, sy, r); break;
    case 7: drawStormGiant(ctx, sx, sy, r, time); break;
    default: drawGasGiant(ctx, sx, sy, r, time, seed); break;
  }
  drawPlanetShadow(ctx, sx, sy, r, lightAngle);
  ctx.restore();

  drawAtmosphericRim(ctx, sx, sy, r, ORBIT_GLOW[planetType % ORBIT_GLOW.length], lightAngle);

  if (planetType === 6) drawRings(ctx, sx, sy, r, "front");
}

// ── Sun ────────────────────────────────────────────────────────
function drawSun(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, time: number) {
  // Outer corona
  [2.8, 2.2, 1.7, 1.4].forEach((s, i) => {
    const cg = ctx.createRadialGradient(cx, cy, r * 0.8, cx, cy, r * s);
    cg.addColorStop(0, `rgba(255,200,50,${[0.04,0.07,0.12,0.18][i]})`);
    cg.addColorStop(1, "rgba(255,120,0,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(cx, cy, r * s, 0, Math.PI * 2);
    ctx.fill();
  });

  // Solar prominences
  for (let i = 0; i < 6; i++) {
    const pAngle = (i / 6) * Math.PI * 2 + time * 0.0002;
    const pLen = r * (0.25 + pseudoRand(i * 3 + Math.floor(time / 5000)) * 0.3);
    const pX = cx + Math.cos(pAngle) * (r + pLen * 0.3);
    const pY = cy + Math.sin(pAngle) * (r + pLen * 0.3);
    const pulse = Math.sin(time * 0.001 + i * 1.1) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(255,${150 + pulse * 80},20,${0.25 + pulse * 0.2})`;
    ctx.lineWidth = r * 0.05;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(pAngle) * r, cy + Math.sin(pAngle) * r);
    ctx.quadraticCurveTo(pX, pY, cx + Math.cos(pAngle + 0.4) * (r + pLen * 0.15), cy + Math.sin(pAngle + 0.4) * (r + pLen * 0.15));
    ctx.stroke();
  }

  // Surface (clipped)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const sg = ctx.createRadialGradient(cx - r * 0.2, cy - r * 0.2, r * 0.05, cx, cy, r);
  sg.addColorStop(0, "#fff8dc");
  sg.addColorStop(0.3, "#ffe060");
  sg.addColorStop(0.65, "#ffa020");
  sg.addColorStop(1, "#cc4000");
  ctx.fillStyle = sg;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

  // Granulation
  const cellCount = Math.floor(r * 0.8);
  for (let i = 0; i < cellCount; i++) {
    const gx = cx + (pseudoRand(i * 5) - 0.5) * r * 1.8;
    const gy = cy + (pseudoRand(i * 5 + 1) - 0.5) * r * 1.8;
    const gr = r * (0.05 + pseudoRand(i * 5 + 2) * 0.09);
    const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    gg.addColorStop(0, `rgba(255,240,180,${pseudoRand(i * 5 + 3) * 0.15})`);
    gg.addColorStop(1, "rgba(255,150,0,0)");
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.arc(gx, gy, gr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Sunspot
  const spA = time * 0.0001;
  const s1x = cx + Math.cos(spA) * r * 0.3;
  const s1y = cy + Math.sin(spA * 0.7) * r * 0.25;
  const spg = ctx.createRadialGradient(s1x, s1y, 0, s1x, s1y, r * 0.12);
  spg.addColorStop(0, "rgba(60,20,0,0.7)");
  spg.addColorStop(0.5, "rgba(100,50,0,0.4)");
  spg.addColorStop(1, "rgba(100,50,0,0)");
  ctx.fillStyle = spg;
  ctx.beginPath();
  ctx.arc(s1x, s1y, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// ── Stars ──────────────────────────────────────────────────────
function drawStars(ctx: CanvasRenderingContext2D, W: number, H: number, time: number) {
  for (let i = 0; i < 200; i++) {
    const sx = pseudoRand(i * 4, W);
    const sy = pseudoRand(i * 4 + 1, H);
    const baseR = pseudoRand(i * 4 + 2, 1.4) + 0.3;
    const twinkle = Math.sin(time * 0.001 * (0.5 + pseudoRand(i * 4 + 3)) + i) * 0.3 + 0.7;
    const colorChoice = pseudoRand(i * 4 + 5);
    const starColor = colorChoice < 0.05
      ? `rgba(200,210,255,${twinkle})`
      : colorChoice < 0.1
      ? `rgba(255,220,180,${twinkle})`
      : `rgba(255,255,255,${twinkle * 0.85})`;

    ctx.beginPath();
    ctx.arc(sx, sy, baseR * twinkle, 0, Math.PI * 2);
    ctx.fillStyle = starColor;
    ctx.fill();

    if (baseR > 1.2) {
      ctx.strokeStyle = `rgba(255,255,255,${twinkle * 0.25})`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(sx - baseR * 2.5, sy); ctx.lineTo(sx + baseR * 2.5, sy);
      ctx.moveTo(sx, sy - baseR * 2.5); ctx.lineTo(sx, sy + baseR * 2.5);
      ctx.stroke();
    }
  }
}

// ── Orbit arrow ────────────────────────────────────────────────
function drawOrbitArrow(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, r: number,
  angle: number, dir: 1 | -1, color: string
) {
  const ax = cx + Math.cos(angle) * r;
  const ay = cy + Math.sin(angle) * r;
  const sz = 7;
  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle + (dir * Math.PI) / 2);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(-sz, -sz / 2);
  ctx.lineTo(-sz, sz / 2);
  ctx.closePath();
  ctx.fillStyle = color + "90";
  ctx.fill();
  ctx.restore();
}

// ── Label below planet ─────────────────────────────────────────
function drawLabel(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, strategy: Strategy) {
  const labelY = sy + r + 10;
  const name = strategy.name.length > 16 ? strategy.name.slice(0, 14) + "…" : strategy.name;
  const ret = formatReturn(strategy.return);
  const retColor = strategy.return >= 0 ? "#4ade80" : "#f87171";

  ctx.font = `bold ${Math.max(9, Math.min(12, r * 0.22))}px Inter,Arial,sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";

  // Name shadow
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillText(name, sx + 1, labelY + 1);
  ctx.fillStyle = "#f0f0f0";
  ctx.fillText(name, sx, labelY);

  // Return %
  const fontSize = Math.max(8, Math.min(11, r * 0.19));
  ctx.font = `bold ${fontSize}px Inter,Arial,sans-serif`;
  ctx.fillStyle = "rgba(0,0,0,0.8)";
  ctx.fillText(ret, sx + 1, labelY + fontSize + 3);
  ctx.fillStyle = retColor;
  ctx.fillText(ret, sx, labelY + fontSize + 2);
}

// ── Helper ─────────────────────────────────────────────────────
function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const maxChars = Math.floor(maxWidth / 6);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxChars) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 2);
}

// ── Main component ─────────────────────────────────────────────
export default function SolarSystem({ core, satellites }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const statesRef = useRef<SatelliteState[]>([]);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; s: Strategy } | null>(null);

  useEffect(() => {
    const maxWeight = Math.max(...satellites.map(s => s.weight), 1);
    const minOrbit = 140;
    const orbitStep = 95;

    statesRef.current = satellites.map((s, i) => ({
      strategy: s,
      angle: (i / satellites.length) * Math.PI * 2,
      orbitRadius: minOrbit + i * orbitStep,
      size: getSatelliteSize(s.weight, maxWeight),
      speed: getSpeed(s.return),
      direction: s.return >= 0 ? 1 : -1,
      planetType: i % 8,
    }));
  }, [satellites]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = 0;

    function draw(timestamp: number) {
      const dt = Math.min(timestamp - lastTime, 50);
      lastTime = timestamp;

      const W = canvas!.width;
      const H = canvas!.height;
      const cx = W / 2;
      const cy = H / 2;

      ctx!.clearRect(0, 0, W, H);
      ctx!.fillStyle = "#06060f";
      ctx!.fillRect(0, 0, W, H);

      drawStars(ctx!, W, H, timestamp);

      // Orbits
      statesRef.current.forEach(sat => {
        ctx!.beginPath();
        ctx!.arc(cx, cy, sat.orbitRadius, 0, Math.PI * 2);
        ctx!.strokeStyle = "rgba(255,255,255,0.07)";
        ctx!.lineWidth = 1;
        ctx!.setLineDash([4, 10]);
        ctx!.stroke();
        ctx!.setLineDash([]);
        drawOrbitArrow(ctx!, cx, cy, sat.orbitRadius, sat.angle + sat.direction * 0.4, sat.direction, ORBIT_GLOW[sat.planetType % ORBIT_GLOW.length]);
      });

      // Sun
      const sunR = 65;
      drawSun(ctx!, cx, cy, sunR, timestamp);

      // Sun label
      ctx!.font = "bold 10px Inter,Arial,sans-serif";
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillStyle = "rgba(255,250,220,0.9)";
      const coreLines = wrapText(core.name, 90);
      coreLines.forEach((line, i) => {
        ctx!.fillText(line, cx, cy + (i - (coreLines.length - 1) / 2) * 13);
      });
      ctx!.font = "9px Inter,Arial,sans-serif";
      ctx!.fillStyle = core.return >= 0 ? "#86efac" : "#fca5a5";
      ctx!.fillText(formatReturn(core.return), cx, cy + coreLines.length * 8 + 5);

      // Satellites
      statesRef.current.forEach((sat, i) => {
        sat.angle += sat.direction * sat.speed * dt;

        const sx = cx + Math.cos(sat.angle) * sat.orbitRadius;
        const sy = cy + Math.sin(sat.angle) * sat.orbitRadius;

        drawPlanet(ctx!, sx, sy, sat.size, sat.planetType, cx, cy, timestamp, i * 7 + 13);
        drawLabel(ctx!, sx, sy, sat.size, sat.strategy);

        sat._sx = sx;
        sat._sy = sy;
      });

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [core, satellites]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    for (const sat of statesRef.current) {
      if (sat._sx === undefined || sat._sy === undefined) continue;
      const dx = mx - sat._sx;
      const dy = my - sat._sy;
      if (Math.sqrt(dx * dx + dy * dy) < sat.size + 8) {
        setTooltip({ x: e.clientX, y: e.clientY, s: sat.strategy });
        return;
      }
    }
    setTooltip(null);
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      />
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900/95 border border-gray-600 rounded-xl p-4 pointer-events-none shadow-2xl min-w-[200px]"
          style={{ left: tooltip.x + 16, top: tooltip.y - 10 }}
        >
          <div className="font-bold text-white text-sm mb-2">{tooltip.s.name}</div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-400">Peso</span>
            <span className="text-white font-semibold">{tooltip.s.weight.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between gap-4 text-xs mt-1">
            <span className="text-gray-400">Rendimento</span>
            <span className={`font-semibold ${tooltip.s.return >= 0 ? "text-green-400" : "text-red-400"}`}>
              {formatReturn(tooltip.s.return)}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-xs mt-1">
            <span className="text-gray-400">Orbita</span>
            <span className="text-blue-400">{tooltip.s.return >= 0 ? "⟳ orario" : "⟲ antiorario"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
