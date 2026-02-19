import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import * as THREE from 'three';

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export class Landing implements AfterViewInit, OnDestroy {
  @ViewChild('particleCanvas', { static: true })
  canvasRef!: ElementRef<HTMLCanvasElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private points!: THREE.Points;
  private animationId = 0;
  private startTime = 0;
  private mouse = { x: 0, y: 0 };
  private targetPositions!: Float32Array;
  private onResize = () => this.handleResize();
  private onMouseMove = (e: MouseEvent) => {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  };

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit() {
    this.initThree();
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    this.renderer?.dispose();
  }

  private sampleTextPixels(
    text: string,
    fontSize: number,
    maxW: number,
    maxH: number,
  ): { x: number; y: number }[] {
    const offscreen = document.createElement('canvas');
    offscreen.width = maxW;
    offscreen.height = maxH;
    const ctx = offscreen.getContext('2d')!;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, maxW, maxH);
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, maxW / 2, maxH / 2);

    const imageData = ctx.getImageData(0, 0, maxW, maxH).data;
    const points: { x: number; y: number }[] = [];
    const step = 3;

    for (let y = 0; y < maxH; y += step) {
      for (let x = 0; x < maxW; x += step) {
        const i = (y * maxW + x) * 4;
        if (imageData[i] > 128) {
          points.push({ x: x - maxW / 2, y: -(y - maxH / 2) });
        }
      }
    }

    return points;
  }

  private initThree() {
    const canvas = this.canvasRef.nativeElement;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, w / h, 1, 5000);
    this.camera.position.z = 400;

    const fontSize = Math.min(w * 0.14, 140);
    const textPixels = this.sampleTextPixels('Imagine', fontSize, w, h);
    const count = textPixels.length;

    const positions = new Float32Array(count * 3);
    this.targetPositions = new Float32Array(count * 3);
    const randoms = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const sandColors = [
      new THREE.Color(0x0277cc),
      new THREE.Color(0x039be5),
      new THREE.Color(0x0288d1),
      new THREE.Color(0x4fc3f7),
      new THREE.Color(0x81d4fa),
    ];

    for (let i = 0; i < count; i++) {
      // Start scattered
      positions[i * 3] = (Math.random() - 0.5) * w * 1.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * h * 1.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 600;

      // Target: text shape
      this.targetPositions[i * 3] = textPixels[i].x;
      this.targetPositions[i * 3 + 1] = textPixels[i].y;
      this.targetPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      randoms[i] = Math.random();

      const color = sandColors[Math.floor(Math.random() * sandColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));

    const material = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.scene.add(this.points);

    this.startTime = performance.now();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = (performance.now() - this.startTime) / 1000;
    const progress = Math.min(elapsed / 3, 1); // 3 second animation
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    const positions = this.points.geometry.attributes['position'].array as Float32Array;
    const randoms = this.points.geometry.attributes['aRandom'].array as Float32Array;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const r = randoms[i];

      // Lerp toward target
      positions[i3] += (this.targetPositions[i3] - positions[i3]) * ease * 0.08;
      positions[i3 + 1] += (this.targetPositions[i3 + 1] - positions[i3 + 1]) * ease * 0.08;
      positions[i3 + 2] += (this.targetPositions[i3 + 2] - positions[i3 + 2]) * ease * 0.08;

      // Subtle idle drift after settling
      if (progress > 0.8) {
        const drift = (progress - 0.8) * 5; // 0 to 1
        positions[i3] += Math.sin(elapsed * 0.5 + r * 10) * 0.3 * drift;
        positions[i3 + 1] += Math.cos(elapsed * 0.4 + r * 8) * 0.3 * drift;
      }

      // Mouse repel
      const dx = positions[i3] - this.mouse.x * 400;
      const dy = positions[i3 + 1] - this.mouse.y * 300;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        const force = (80 - dist) / 80;
        positions[i3] += (dx / dist) * force * 4;
        positions[i3 + 1] += (dy / dist) * force * 4;
      }
    }

    this.points.geometry.attributes['position'].needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }

  onLogoHover() {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  private handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
