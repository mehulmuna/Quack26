import { motion } from "framer-motion";

const RING_COUNT = 3;

export default function OrbVisual({ isRunning, servicesCount = 0 }) {
  return (
    <div className="relative flex items-center justify-center h-48">
      {/* Outer glow */}
      <motion.div
        className="absolute w-40 h-40 rounded-full"
        style={{
          background: isRunning
            ? "radial-gradient(circle, hsla(199,89%,48%,0.15) 0%, transparent 70%)"
            : "radial-gradient(circle, hsla(263,70%,58%,0.08) 0%, transparent 70%)"
        }}
        animate={{
          scale: isRunning ? [1, 1.3, 1] : [1, 1.1, 1],
          opacity: isRunning ? [0.6, 1, 0.6] : [0.3, 0.5, 0.3]
        }}
        transition={{ duration: isRunning ? 1.5 : 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Orbiting rings */}
      {Array.from({ length: RING_COUNT }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border"
          style={{
            width: 80 + i * 36,
            height: 80 + i * 36,
            borderColor: isRunning
              ? `hsla(199,89%,48%,${0.25 - i * 0.06})`
              : `hsla(215,20%,50%,${0.12 - i * 0.03})`
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: 12 + i * 6,
            repeat: Infinity,
            ease: "linear",
            direction: i % 2 === 0 ? "normal" : "reverse"
          }}
        >
          {/* Orbiting dot */}
          <motion.div
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
            style={{
              backgroundColor: isRunning ? "hsl(199,89%,48%)" : "hsl(215,20%,40%)",
              boxShadow: isRunning ? "0 0 8px hsl(199,89%,48%)" : "none"
            }}
          />
        </motion.div>
      ))}

      {/* Core orb */}
      <motion.div
        className="relative w-20 h-20 rounded-full flex items-center justify-center z-10"
        style={{
          background: isRunning
            ? "radial-gradient(circle at 35% 35%, hsl(199,89%,58%), hsl(199,89%,38%), hsl(263,70%,48%))"
            : "radial-gradient(circle at 35% 35%, hsl(215,20%,35%), hsl(222,30%,18%))",
          boxShadow: isRunning
            ? "0 0 40px hsla(199,89%,48%,0.4), 0 0 80px hsla(199,89%,48%,0.15), inset 0 0 20px hsla(199,89%,68%,0.2)"
            : "0 0 20px hsla(215,20%,50%,0.1), inset 0 0 15px hsla(215,20%,50%,0.1)"
        }}
        animate={{
          scale: isRunning ? [1, 1.06, 1] : 1,
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="font-mono text-sm font-bold text-foreground">
          {servicesCount}
        </span>
      </motion.div>

      {/* Status label */}
      <motion.div
        className="absolute -bottom-2 font-mono text-[10px] tracking-[0.2em] uppercase"
        style={{ color: isRunning ? "hsl(199,89%,48%)" : "hsl(215,20%,50%)" }}
        animate={{ opacity: isRunning ? [0.6, 1, 0.6] : 0.5 }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {isRunning ? "scanning" : "idle"}
      </motion.div>
    </div>
  );
}