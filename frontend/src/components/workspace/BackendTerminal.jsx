import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { TerminalSquare, Wifi, WifiOff } from "lucide-react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

function getTerminalSocketUrl() {
  if (typeof window === "undefined") return "";

  const apiBase = (/** @type {any} */ (import.meta)).env?.VITE_API_URL ?? "";
  const normalizedApiBase = String(apiBase).replace(/\/$/, "");
  const baseUrl = normalizedApiBase
    ? new URL(normalizedApiBase, window.location.href)
    : new URL("http://localhost:3002");
  baseUrl.protocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
  baseUrl.pathname = "/terminal";
  baseUrl.search = "";
  baseUrl.hash = "";
  return baseUrl.toString();
}

/** @param {string} text */
function escapeTerminalText(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, "");
}

export default function BackendTerminal({ onEvent }) {
  const containerRef = useRef(null);
  const [connectionState, setConnectionState] = useState("connecting");
  const [shellLabel, setShellLabel] = useState("backend shell");

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: 'Consolas, "SFMono-Regular", monospace',
      fontSize: 12,
      convertEol: true,
      scrollback: 4000,
      theme: {
        background: "#0b1020",
        foreground: "#e2e8f0",
        cursor: "#7dd3fc",
      },
    });
    const fitAddon = new FitAddon();

    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);
    fitAddon.fit();

    terminal.writeln("[connecting to backend terminal...]");

    const socketUrl = getTerminalSocketUrl();
    let socket = null;
    let disposed = false;
    let reconnectTimer = null;
    let reconnectAttempt = 0;

    const refreshSize = () => {
      try {
        fitAddon.fit();
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: "resize",
            cols: terminal.cols,
            rows: terminal.rows,
          }));
        }
      } catch {
        // The backend shell currently ignores resize events, so this is best-effort.
      }
    };

    const scheduleReconnect = () => {
      if (disposed) return;

      window.clearTimeout(reconnectTimer);
      reconnectAttempt += 1;
      setConnectionState("connecting");

      const delay = Math.min(5000, 500 * reconnectAttempt);
      terminal.writeln(`\r\n[terminal reconnecting in ${delay}ms...]\r\n`);
      reconnectTimer = window.setTimeout(() => {
        if (!disposed) connect();
      }, delay);
    };

    const connect = () => {
      if (disposed) return;

      try {
        socket?.close();
      } catch {
        // ignore stale socket cleanup failures
      }

      socket = new WebSocket(socketUrl);

      socket.addEventListener("open", () => {
        reconnectAttempt = 0;
        setConnectionState("connected");
        terminal.writeln("\r\n[connected] backend shell ready\r\n");
        onEvent?.({ type: "connected", socketUrl });
        refreshSize();
      });

      socket.addEventListener("message", (event) => {
        let payload;
        try {
          payload = JSON.parse(event.data);
        } catch {
          terminal.write(escapeTerminalText(String(event.data ?? "")));
          return;
        }

        if (payload.type === "ready") {
          setShellLabel(payload.shell || "backend shell");
          onEvent?.(payload);
          terminal.writeln(`\r\n[ready] ${payload.shell || "backend shell"} in ${payload.cwd || "the project"}\r\n`);
          return;
        }

        if (payload.type === "output" && typeof payload.data === "string") {
          onEvent?.(payload);
          terminal.write(payload.data);
          return;
        }

        if (payload.type === "exit") {
          setConnectionState("closed");
          onEvent?.(payload);
          terminal.writeln(`\r\n[terminal exited] code=${payload.code ?? "?"} signal=${payload.signal ?? "-"}\r\n`);
        }
      });

      socket.addEventListener("close", () => {
        if (disposed) return;

        setConnectionState("closed");
        terminal.writeln("\r\n[terminal disconnected]\r\n");
        scheduleReconnect();
      });

      socket.addEventListener("error", () => {
        if (disposed) return;

        console.error("[terminal] websocket error", socketUrl, socket);
        setConnectionState("error");
        terminal.writeln("\r\n[terminal connection error]\r\n");
        scheduleReconnect();
      });
    };

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => refreshSize());
      resizeObserver.observe(containerRef.current);
    }

    const onWindowResize = () => refreshSize();
    window.addEventListener("resize", onWindowResize);

    connect();

    /** @param {string} data */
    terminal.onData((data) => {
      if (socket.readyState !== WebSocket.OPEN) return;
      onEvent?.({ type: "input", data });
      socket.send(JSON.stringify({ type: "input", data }));
    });

    terminal.focus();

    return () => {
      disposed = true;
      window.clearTimeout(reconnectTimer);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onWindowResize);
      socket?.close();
      terminal.dispose();
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#0c1224] via-[#0b1020] to-[#070b16] text-slate-200 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/[0.04] px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-400/10 border border-emerald-400/20 flex items-center justify-center">
            <TerminalSquare className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-wide">Backend Terminal</h3>
            <p className="text-[11px] text-slate-400">Interactive shell connected to the backend server</p>
          </div>
        </div>

        <Badge
          variant="secondary"
          className={`text-[9px] h-5 px-2 border ${connectionState === "connected" ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20" : connectionState === "error" ? "bg-red-400/10 text-red-300 border-red-400/20" : "bg-slate-500/10 text-slate-300 border-slate-500/20"}`}
        >
          <span className="inline-flex items-center gap-1">
            {connectionState === "connected" ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {connectionState === "connected" ? shellLabel : connectionState}
          </span>
        </Badge>
      </div>

      <div className="border-b border-white/5 bg-black/20 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
        Type in the shell to send input to the backend. Output stays live even if the server restarts.
      </div>

      <div className="h-[28rem] w-full overflow-hidden bg-[#060b15]">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </section>
  );
}
