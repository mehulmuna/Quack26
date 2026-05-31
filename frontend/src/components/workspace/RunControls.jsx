import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";
import { motion } from "framer-motion";

export default function RunControls({ isRunning, onRun, onStop }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {!isRunning ? (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onRun}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-2.5 rounded-full font-medium tracking-wide gap-2 shadow-lg shadow-primary/20"
          >
            <Play className="w-4 h-4 fill-current" />
            Run Scan
          </Button>
        </motion.div>
      ) : (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            onClick={onStop}
            variant="destructive"
            className="px-8 py-2.5 rounded-full font-medium tracking-wide gap-2"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </Button>
        </motion.div>
      )}
    </div>
  );
}