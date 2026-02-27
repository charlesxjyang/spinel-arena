/**
 * E2B sandbox management for code execution.
 *
 * Two sandbox types:
 * - "vanilla": base Python with numpy, scipy, matplotlib, pandas
 * - "spinel": full scientific stack with pymatgen, ase, hyperspy, cellpy, etc.
 *
 * To avoid cold-start latency, we use custom E2B sandbox templates
 * that have packages pre-installed. You create these once:
 *
 *   e2b template init --name spinel-sandbox
 *   # edit the Dockerfile to pip install everything
 *   e2b template build
 *
 * Until templates are set up, we fall back to installing on-demand
 * (slower but works for development).
 */

import { Sandbox, Execution } from "@e2b/code-interpreter";
import { getPackageList } from "./spinel-plugin";

// Custom template IDs — set these after building E2B templates
// For now, we use the default Python template and install on demand
const SPINEL_TEMPLATE = process.env.E2B_SPINEL_TEMPLATE || undefined;
const VANILLA_TEMPLATE = process.env.E2B_VANILLA_TEMPLATE || undefined;

// Track active sandboxes per session
const activeSandboxes = new Map<string, Sandbox>();

export type SandboxMode = "vanilla" | "spinel";

async function buildInstallScript(): Promise<string> {
  const packages = await getPackageList();
  const packageList = packages.map((p) => `    "${p}"`).join(",\n");
  return `
import subprocess, sys
packages = [
${packageList},
]
for pkg in packages:
    try:
        __import__(pkg.replace("-", "_").replace(".", "_"))
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", pkg])
print("Spinel packages ready")
`;
}

export async function getOrCreateSandbox(
  sessionId: string,
  mode: SandboxMode
): Promise<Sandbox> {
  const key = `${sessionId}-${mode}`;

  if (activeSandboxes.has(key)) {
    return activeSandboxes.get(key)!;
  }

  const template = mode === "spinel" ? SPINEL_TEMPLATE : VANILLA_TEMPLATE;

  const sandbox = await Sandbox.create({
    ...(template ? { template } : {}),
    apiKey: process.env.E2B_API_KEY,
  });

  // If no custom template, install packages on demand
  if (!template && mode === "spinel") {
    const installScript = await buildInstallScript();
    await sandbox.runCode(installScript, {
      timeoutMs: 120_000,
    });
  }

  // Set MP_API_KEY in sandbox environment
  if (mode === "spinel" && process.env.MP_API_KEY) {
    await sandbox.runCode(
      `import os; os.environ["MP_API_KEY"] = "${process.env.MP_API_KEY}"`
    );
  }

  activeSandboxes.set(key, sandbox);
  return sandbox;
}

export async function executeCode(
  sandbox: Sandbox,
  code: string
): Promise<{
  text: string;
  images: string[]; // base64 PNGs
  error: string | null;
}> {
  try {
    const execution: Execution = await sandbox.runCode(code, {
      timeoutMs: 60_000,
    });

    const text = execution.logs.stdout.join("\n") + execution.logs.stderr.join("\n");

    // Extract any generated images (matplotlib plots, etc.)
    const images: string[] = [];
    for (const result of execution.results) {
      if (result.png) {
        images.push(result.png);
      }
    }

    const error = execution.error ? execution.error.value : null;

    return { text: text.trim(), images, error };
  } catch (e: any) {
    return { text: "", images: [], error: e.message || "Execution failed" };
  }
}

export async function uploadFileToSandbox(
  sandbox: Sandbox,
  filename: string,
  content: Buffer
): Promise<string> {
  const path = `/home/user/${filename}`;
  await sandbox.files.write(path, new Uint8Array(content).buffer as ArrayBuffer);
  return path;
}

export async function closeSandbox(sessionId: string, mode: SandboxMode) {
  const key = `${sessionId}-${mode}`;
  const sandbox = activeSandboxes.get(key);
  if (sandbox) {
    await sandbox.kill();
    activeSandboxes.delete(key);
  }
}
