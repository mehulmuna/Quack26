const path = require("node:path");
const { WebSocketServer, WebSocket } = require("ws");
const pty = require("node-pty");

const activeSessions = new Set();

function resolveShell() {
    if (process.platform === "win32") {
        return {
            command: process.env.ComSpec || "cmd.exe",
            args: [],
        };
    }

    return {
        command: process.env.SHELL || "/bin/sh",
        args: process.env.SHELL ? ["-l"] : [],
    };
}

function createTerminalMessage(type, payload = {}) {
    return JSON.stringify({ type, ...payload });
}

function broadcastTerminalOutput(data) {
    if (!data) return;

    for (const session of activeSessions) {
        session.send("output", { data });
    }
}

class ShellSession {
    constructor() {
        const shell = resolveShell();

        this.cwd = path.resolve(__dirname, "../..");
        this.shell = shell.command;
        this.ws = null;
        this.proc = pty.spawn(shell.command, shell.args, {
            cwd: this.cwd,
            env: process.env,
            cols: 80,
            rows: 24,
            name: "xterm-color",
        });

        this.proc.onData((data) => this.send("output", { data }));
        this.proc.onExit(({ exitCode, signal }) => {
            this.send("exit", { code: exitCode, signal });
        });
    }

    attach(ws) {
        this.ws = ws;
        activeSessions.add(this);
        this.send("ready", {
            shell: this.shell,
            cwd: this.cwd,
        });
        this.send("output", {
            data: `\n[connected] ${this.shell} in ${this.cwd}\n`,
        });
    }

    send(type, payload = {}) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(createTerminalMessage(type, payload));
    }

    handleMessage(message) {
        if (!message || typeof message !== "object") return;

        if (message.type === "input" && typeof message.data === "string") {
            this.proc.write(message.data);
            return;
        }

        if (message.type === "command" && typeof message.command === "string") {
            this.proc.write(`${message.command}\n`);
            return;
        }

        if (message.type === "resize") {
            const cols = Number(message.cols);
            const rows = Number(message.rows);

            if (Number.isFinite(cols) && Number.isFinite(rows) && cols > 0 && rows > 0) {
                this.proc.resize(cols, rows);
            }
            return;
        }

        if (message.type === "signal" && typeof message.signal === "string") {
            this.proc.kill(message.signal);
        }
    }

    dispose() {
        activeSessions.delete(this);
        this.proc.kill();
    }
}

function attachTerminalServer(server, routePath = "/terminal") {
    const wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
        try {
            const requestUrl = new URL(request.url, `http://${request.headers.host}`);

            if (requestUrl.pathname !== routePath) {
                socket.destroy();
                return;
            }

        } catch (err) {
            console.error('[terminal] upgrade parse error', err && err.message);
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
            const session = new ShellSession();

            ws.on("message", (rawMessage) => {
                try {
                    session.handleMessage(JSON.parse(rawMessage.toString("utf8")));
                } catch (error) {
                    session.send("output", { data: `\n[terminal parse error] ${error.message}\n` });
                }
            });

            ws.on("close", () => session.dispose());
            ws.on("error", (err) => {
                console.error('[terminal] websocket error', err && err.message);
                session.dispose();
            });

            session.attach(ws);
        });
    });

    return wss;
}

module.exports = {
    attachTerminalServer,
    broadcastTerminalOutput,
};