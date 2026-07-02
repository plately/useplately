import { useEffect, useRef } from 'react';

interface NodeConnectionAnimationProps {
  sourceElement: HTMLElement | null;
  targetElement: HTMLElement | null;
  onComplete?: () => void;
  duration?: number;
}

export default function NodeConnectionAnimation({ 
  sourceElement, 
  targetElement, 
  onComplete,
  duration = 800 
}: NodeConnectionAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!sourceElement || !targetElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to cover the entire viewport
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();

    // Get element positions
    const sourceRect = sourceElement.getBoundingClientRect();
    const targetRect = targetElement.getBoundingClientRect();

    const startX = sourceRect.left + sourceRect.width / 2;
    const startY = sourceRect.top + sourceRect.height / 2;
    const endX = targetRect.left + targetRect.width / 2;
    const endY = targetRect.top + targetRect.height / 2;

    // Animation state
    let progress = 0;
    const startTime = Date.now();

    // Draw connection line with animation
    const animate = () => {
      const elapsed = Date.now() - startTime;
      progress = Math.min(elapsed / duration, 1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate current line end position
      const currentX = startX + (endX - startX) * progress;
      const currentY = startY + (endY - startY) * progress;

      // Create gradient for the line
      const gradient = ctx.createLinearGradient(startX, startY, currentX, currentY);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // Blue start
      gradient.addColorStop(1, 'rgba(147, 51, 234, 0.8)'); // Purple end

      // Draw the connecting line
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.setLineDash([10, 5]);
      ctx.lineDashOffset = -elapsed * 0.05; // Animated dash

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(currentX, currentY);
      ctx.stroke();

      // Draw connection points
      const drawPoint = (x: number, y: number, radius: number, color: string) => {
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      };

      // Source point (always visible)
      drawPoint(startX, startY, 6, '#3b82f6');

      // Target point (appears when line reaches it)
      if (progress > 0.8) {
        const pointProgress = (progress - 0.8) / 0.2;
        const radius = 6 * pointProgress;
        drawPoint(endX, endY, radius, '#9333ea');
      }

      // Pulse effect at connection point
      if (progress >= 1) {
        const pulseRadius = 20 * Math.sin(elapsed * 0.01);
        ctx.beginPath();
        ctx.arc(endX, endY, pulseRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(147, 51, 234, ${0.3 * (1 - pulseRadius / 20)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Animation complete, show brief connection established effect
        setTimeout(() => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          onComplete?.();
        }, 500);
      }
    };

    animate();

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sourceElement, targetElement, duration, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 pointer-events-none z-50"
      style={{ mixBlendMode: 'normal' }}
    />
  );
}