import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Globe, Database, Monitor, Server,
  Layers, Radio, Cpu, Shield, HardDrive, Box
} from "lucide-react";

const typeIcons = {
  api: Globe,
  database: Database,
  frontend: Monitor,
  backend: Server,
  microservice: Layers,
  queue: Radio,
  cache: Cpu,
  gateway: Shield,
  auth: Shield,
  storage: HardDrive,
  other: Box
};

const statusColors = {
  discovered: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  scanning: "bg-primary/10 text-primary border-primary/20",
  analyzed: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  error: "bg-destructive/10 text-destructive border-destructive/20"
};

export default function ServicesList({ services = [], currentService }) {
  return (
    <div className="space-y-2">
      <ScrollArea className="h-48">
        <div className="space-y-1.5 pr-2">
          <AnimatePresence>
            {services.map((service, i) => {
              const Icon = typeIcons[service.type] || Box;
              const isCurrent = currentService === service.name;

              return (
                <motion.div
                  key={service.id || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isCurrent
                      ? "bg-primary/10 border border-primary/20"
                      : "bg-muted/30 hover:bg-muted/50"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  }`} />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{service.name}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">
                      {service.language || service.type}
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 h-4 ${statusColors[service.status] || ""}`}
                  >
                    {service.status}
                  </Badge>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {services.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 italic">
              No services discovered yet
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}