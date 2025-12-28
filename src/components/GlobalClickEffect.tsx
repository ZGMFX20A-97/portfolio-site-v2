import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";

const COLORS = [
  "bg-neu-pink",
  "bg-neu-yellow",
  "bg-neu-lime",
  "bg-neu-blue",
  "bg-neu-purple",
  "bg-neu-text", // Add black for contrast
];

interface ClickEvent {
  id: number;
  x: number;
  y: number;
}

const Particle = ({ x, y, color }: { x: number; y: number; color: string }) => {
  const angle = Math.random() * Math.PI * 2;
  const velocity = Math.random() * 100 + 50; // Distance 50-150px
  const tx = Math.cos(angle) * velocity;
  const ty = Math.sin(angle) * velocity;
  const rotation = Math.random() * 360;

  return (
    <motion.div
      className={`absolute w-3 h-3 border-2 border-black ${color}`}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
      animate={{
        x: tx,
        y: ty,
        opacity: 0,
        scale: 0,
        rotate: rotation,
      }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{ left: x, top: y }}
    />
  );
};

const Explosion = (
  { x, y, onComplete }: { x: number; y: number; onComplete: () => void },
) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
        <Particle
          key={i}
          x={x}
          y={y}
          color={COLORS[Math.floor(Math.random() * COLORS.length)]}
        />
      ))}
    </>
  );
};

const GlobalClickEffect = () => {
  const [clicks, setClicks] = useState<ClickEvent[]>([]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Use timestamp + random to ensure uniqueness
      const newClick = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };
      setClicks((prev) => [...prev, newClick]);
    };

    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);

  const removeClick = useCallback((id: number) => {
    setClicks((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {clicks.map((click) => (
        <Explosion
          key={click.id}
          x={click.x}
          y={click.y}
          onComplete={() => removeClick(click.id)}
        />
      ))}
    </div>
  );
};

export default GlobalClickEffect;
