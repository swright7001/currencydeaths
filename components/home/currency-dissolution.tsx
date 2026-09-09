"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { purchasingPowerExample } from "../../lib/calculations/purchasing-power-example";

const TEXTURE = "/images/banknote-texture.png";
const WIDTH = 1400;
const HEIGHT = 640;
const noise = (seed: number) => {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
};

/** Texture-based 2.5D illustration. Geometry is decorative, never measurement. */
function drawNote(context: CanvasRenderingContext2D, image: HTMLImageElement, loss: number) {
  context.clearRect(0, 0, WIDTH, HEIGHT);
  const progress = loss / 100;
  const left = 95;
  const top = 85;
  const width = 1040;
  const height = 475;
  const edge = left + width * (1 - progress);
  context.save();
  context.translate(WIDTH / 2, HEIGHT / 2);
  context.rotate(-0.055);
  context.translate(-WIDTH / 2, -HEIGHT / 2);
  if (loss < 100) {
    context.save();
    context.beginPath();
    context.moveTo(left, top);
    context.lineTo(edge, top);
    for (let y = 0; y <= height; y += 2) {
      const jagged = loss === 0 ? 0 : (noise(y + 4) - 0.5) * 23 + Math.sin(y * 0.08) * 11 + Math.sin(y * 0.023) * 20;
      context.lineTo(Math.max(left, edge + jagged), top + y);
    }
    context.lineTo(left, top + height);
    context.closePath();
    context.clip();
    context.drawImage(image, left, top, width, height);
    context.restore();
  }
  // Irregular tapered flakes follow the moving tear front; no rectangular tile grid.
  for (let i = 0; i < 1050; i += 1) {
    const birth = noise(i + 8);
    const age = (progress - birth) / 0.3;
    if (age <= 0 || age >= 1 || loss === 100) continue;
    const originX = left + width * (1 - birth);
    const originY = top + noise(i + 23) * height;
    const size = 1.2 + Math.pow(noise(i + 82), 3) * 13;
    const x = originX + age * (160 + noise(i + 73) * 300);
    const y = originY + Math.sin(i) * age * 135 - age * age * 60;
    context.save();
    context.translate(x, y);
    context.rotate(age * (noise(i + 28) - 0.5) * 12);
    context.globalAlpha = (1 - age) * 0.9;
    context.fillStyle = `rgb(${140 + noise(i) * 80}, ${111 + noise(i) * 70}, ${78 + noise(i) * 60})`;
    context.beginPath();
    context.moveTo(-size, -size * 0.3);
    context.lineTo(-size * 0.25, -size * 0.7);
    context.lineTo(size * 0.7, -size * 0.4);
    context.lineTo(size * 0.4, size * 0.25);
    context.lineTo(-size * 0.4, size * 0.6);
    context.closePath();
    context.fill();
    context.clip();
    const sampleX = ((originX - left) / width) * image.naturalWidth;
    const sampleY = ((originY - top) / height) * image.naturalHeight;
    context.drawImage(image, sampleX, sampleY, size * 3, size * 3, -size, -size, size * 2, size * 2);
    context.restore();
  }
  context.restore();
}

export function CurrencyDissolution() {
  const section = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const texture = useRef<HTMLImageElement | null>(null);
  const [loss, setLoss] = useState(35);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const { unitsRemaining } = purchasingPowerExample(loss);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => {
      setReducedMotion(media.matches);
      if (media.matches) setPlaying(false);
    };
    updateMotion();
    media.addEventListener("change", updateMotion);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) setPlaying(false);
      if (entry.isIntersecting && !texture.current) {
        const image = new window.Image();
        texture.current = image;
        image.onload = () => setReady(Boolean(canvas.current?.getContext("2d")));
        image.src = TEXTURE;
      }
    });
    if (section.current) observer.observe(section.current);
    const hide = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", hide);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", hide);
      if (texture.current) texture.current.onload = null;
      texture.current = null;
    };
  }, []);

  useEffect(() => {
    const context = canvas.current?.getContext("2d");
    if (context && texture.current && ready) drawNote(context, texture.current, loss);
  }, [loss, ready]);

  useEffect(() => {
    if (!playing || reducedMotion) return;
    let value = loss;
    const timer = window.setInterval(() => {
      value = Math.min(100, value + 0.5);
      setLoss(value);
      if (value === 100) setPlaying(false);
    }, 70);
    return () => window.clearInterval(timer);
    // Playback captures its starting value; slider input pauses it first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, reducedMotion]);

  return (
    <section ref={section} className="dissolution shell-container" id="purchasing-power" aria-labelledby="dissolution-title">
      <header className="dissolution__heading">
        <p className="section-kicker">An interactive study of purchasing power</p>
        <h2 id="dissolution-title">The note remains.<br /><span>The value disappears.</span></h2>
        <p>Move the slider. See how much the same money can still buy.</p>
      </header>
      <div className="dissolution__stage" aria-hidden="true">
        <Image src={TEXTURE} alt="" fill sizes="(max-width: 700px) 100vw, 1200px" className={`dissolution__fallback${ready ? " dissolution__fallback--hidden" : ""}`} />
        <canvas ref={canvas} width={WIDTH} height={HEIGHT} className={ready ? "dissolution__canvas" : "dissolution__canvas dissolution__canvas--hidden"} />
      </div>
      <div className="dissolution__controls">
        <div className="dissolution__slider-label"><label htmlFor="purchasing-power-loss">Purchasing power lost</label><span>Illustrative example</span></div>
        <input id="purchasing-power-loss" type="range" min="0" max="100" step="1" value={loss} aria-valuetext={`${Math.round(loss)} percent lost. Buys ${Math.round(unitsRemaining)} of the original 100 units.`} onChange={(event) => { setPlaying(false); setLoss(Number(event.target.value)); }} />
        <div className="dissolution__scale" aria-hidden="true"><span>0% lost</span><span>100% lost</span></div>
        <div className="dissolution__bottom">
          <div className="dissolution__buttons">
            <button type="button" disabled={reducedMotion || !ready} onClick={() => { if (loss === 100) setLoss(0); setPlaying(!playing); }}>{playing ? "Ⅱ Pause" : "▶ Play dissolution"}</button>
            <button type="button" onClick={() => { setPlaying(false); setLoss(0); }}>↺ Reset</button>
          </div>
          <div className="dissolution__reading"><span>The same note buys</span><p><strong>{unitsRemaining.toFixed(0)}</strong> of the original 100 units</p></div>
          <div className="dissolution__reading"><span>Purchasing power lost</span><p><strong>{loss.toFixed(0)}%</strong></p></div>
        </div>
        {reducedMotion ? <p className="dissolution__motion-note">Motion paused for your preference. Explore with the slider.</p> : null}
      </div>
    </section>
  );
}
