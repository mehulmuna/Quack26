import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import RunControls from "@/components/workspace/RunControls";

export default function ProjectInputs({ config, onChange, isRunning, onRun, onStop }) {
  const addCommand = () => {
    onChange({
      ...config,
      commands: [...(config.commands || []), { label: "", command: "" }]
    });
  };

  const removeCommand = (index) => {
    onChange({
      ...config,
      commands: config.commands.filter((_, i) => i !== index)
    });
  };

  const updateCommand = (index, field, value) => {
    const newCommands = [...config.commands];
    newCommands[index] = { ...newCommands[index], [field]: value };
    onChange({ ...config, commands: newCommands });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
        Configuration
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Project Name</Label>
          <Input
            value={config.name || ""}
            onChange={(e) => onChange({ ...config, name: e.target.value })}
            placeholder="my-project"
            className="h-8 bg-muted/50 border-border/50 font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Directory</Label>
          <Input
            value={config.directory || ""}
            onChange={(e) => onChange({ ...config, directory: e.target.value })}
            placeholder="/path/to/project"
            className="h-8 bg-muted/50 border-border/50 font-mono text-xs"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Run Commands</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={addCommand}
            className="h-6 px-2 text-xs text-primary hover:text-primary/80"
          >
            <Plus className="w-3 h-3 mr-1" />
            Add
          </Button>
        </div>

        {(config.commands || []).map((cmd, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              value={cmd.label}
              onChange={(e) => updateCommand(i, "label", e.target.value)}
              placeholder="Label"
              className="h-7 bg-muted/50 border-border/50 font-mono text-xs w-28"
            />
            <Input
              value={cmd.command}
              onChange={(e) => updateCommand(i, "command", e.target.value)}
              placeholder="npm run dev"
              className="h-7 bg-muted/50 border-border/50 font-mono text-xs flex-1"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeCommand(i)}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-border/30">
        <RunControls isRunning={isRunning} onRun={onRun} onStop={onStop} />
      </div>
    </div>
  );
}