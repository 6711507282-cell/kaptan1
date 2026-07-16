import React, { useEffect, useRef } from 'react';

export default function Background() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };

    window.addEventListener('resize', handleResize);

    // Star/particle structure
    const particles: {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
      opacity: number;
      pulseSpeed: number;
    }[] = [];

    const colors = [
      'rgba(59, 130, 246, ',  // Blue
      'rgba(147, 51, 234, ',  // Purple
      'rgba(139, 92, 246, ',  // Violet
      'rgba(6, 182, 212, ',   // Cyan
    ];

    // Seed particles
    const particleCount = Math.min(60, Math.floor((width * height) / 25000));
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      });
    }

    // Gradient angles
    let angle = 0;

    const draw = () => {
      // Create rich fluid radial and linear gradient to fulfill "น้ำเงิน ม่วง ดำ" (Blue, Purple, Black)
      angle += 0.001;
      
      const x1 = width / 2 + Math.cos(angle) * (width / 3);
      const y1 = height / 2 + Math.sin(angle) * (height / 3);
      const x2 = width / 2 - Math.cos(angle) * (width / 3);
      const y2 = height / 2 - Math.sin(angle) * (height / 3);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      // Dark slate/black base with deep blue and purple highlights
      grad.addColorStop(0, '#020108'); // Pure Black with subtle purple/blue tint
      grad.addColorStop(0.3, '#0c0721'); // Deep Violet/Indigo
      grad.addColorStop(0.6, '#0b1636'); // Deep Navy Blue
      grad.addColorStop(1, '#020005'); // Deep Black

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw flowing cosmic background gas (radial ambient lights)
      const pulseRadius1 = (Math.sin(angle * 2) * 0.1 + 0.9) * (width > height ? width * 0.35 : height * 0.35);
      const radGrad1 = ctx.createRadialGradient(
        width * 0.2 + Math.cos(angle * 1.5) * 100, 
        height * 0.3 + Math.sin(angle * 1.5) * 100, 
        50, 
        width * 0.2, 
        height * 0.3, 
        pulseRadius1
      );
      radGrad1.addColorStop(0, 'rgba(59, 130, 246, 0.15)'); // Blue
      radGrad1.addColorStop(0.5, 'rgba(147, 51, 234, 0.05)'); // Purple
      radGrad1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radGrad1;
      ctx.fillRect(0, 0, width, height);

      const pulseRadius2 = (Math.cos(angle * 1.2) * 0.15 + 0.85) * (width > height ? width * 0.4 : height * 0.4);
      const radGrad2 = ctx.createRadialGradient(
        width * 0.8 + Math.sin(angle * 1.1) * 150, 
        height * 0.75 + Math.cos(angle * 1.1) * 150, 
        30, 
        width * 0.8, 
        height * 0.75, 
        pulseRadius2
      );
      radGrad2.addColorStop(0, 'rgba(147, 51, 234, 0.18)'); // Purple glow
      radGrad2.addColorStop(0.5, 'rgba(59, 130, 246, 0.05)'); // Blue glow
      radGrad2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = radGrad2;
      ctx.fillRect(0, 0, width, height);

      // Draw and animate stars/particles
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap around boundaries
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Pulse opacity
        p.opacity += p.pulseSpeed;
        if (p.opacity > 0.85 || p.opacity < 0.15) {
          p.pulseSpeed = -p.pulseSpeed;
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.max(0, Math.min(1, p.opacity)) + ')';
        ctx.shadowBlur = p.size * 2;
        ctx.shadowColor = p.color + '0.8)';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for efficiency
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none z-0" />;
}
