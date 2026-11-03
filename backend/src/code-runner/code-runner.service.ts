import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodeRunnerLanguage } from './dto/run-code.dto';

type RunnerStage = {
  stdout?: string | null;
  stderr?: string | null;
  output?: string | null;
  code?: number | null;
  signal?: string | null;
  status?: string | null;
  message?: string | null;
};

type Runtime = {
  language: string;
  file: string;
  judge0Id: number;
};

type Judge0Result = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: { id?: number; description?: string } | null;
};

const DEFAULT_JUDGE0_URL = 'https://ce.judge0.com';

// Judge0 language IDs are stable runtime identifiers exposed by its public
// CE instance. CODE_RUNNER_URL can still point to a private Judge0 or Piston
// deployment without changing the frontend contract.
const runtimeByLanguage: Record<CodeRunnerLanguage, Runtime> = {
  c: { language: 'c', file: 'main.c', judge0Id: 103 },
  cpp: { language: 'c++', file: 'main.cpp', judge0Id: 105 },
  csharp: { language: 'csharp', file: 'Program.cs', judge0Id: 51 },
  dart: { language: 'dart', file: 'main.dart', judge0Id: 90 },
  java: { language: 'java', file: 'Main.java', judge0Id: 91 },
  javascript: { language: 'javascript', file: 'main.js', judge0Id: 102 },
  kotlin: { language: 'kotlin', file: 'Main.kt', judge0Id: 111 },
  php: { language: 'php', file: 'main.php', judge0Id: 98 },
  python: { language: 'python', file: 'main.py', judge0Id: 109 },
  shell: { language: 'bash', file: 'main.sh', judge0Id: 46 },
  sql: { language: 'sqlite3', file: 'main.sql', judge0Id: 82 },
};

const clampOutput = (value: unknown, max = 8000) => String(value ?? '').slice(0, max);

@Injectable()
export class CodeRunnerService {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const rawUrl = this.config.get<string>('CODE_RUNNER_URL')?.trim().replace(/\/$/, '');
    const requestedProvider = this.config.get<string>('CODE_RUNNER_PROVIDER')?.trim().toLowerCase();

    // An explicit provider keeps private deployments predictable. With no
    // URL, use the HTTPS Judge0 CE sandbox so production works immediately.
    if (requestedProvider === 'piston') {
      return { provider: 'piston', baseUrl: rawUrl || '' } as const;
    }

    if (requestedProvider === 'judge0' || !rawUrl || /^your[-_]/i.test(rawUrl)) {
      return { provider: 'judge0', baseUrl: rawUrl || DEFAULT_JUDGE0_URL } as const;
    }

    // Existing installations used CODE_RUNNER_URL for Piston. Preserve that
    // contract when a real URL is supplied without a provider flag.
    return { provider: 'piston', baseUrl: rawUrl } as const;
  }

  private endpoint() {
    const { provider, baseUrl } = this.settings();
    if (!baseUrl) return '';
    if (provider === 'judge0') return `${baseUrl}/submissions?base64_encoded=false&wait=true`;
    return baseUrl.endsWith('/execute') ? baseUrl : `${baseUrl}/api/v2/execute`;
  }

  configuration() {
    const { provider, baseUrl } = this.settings();
    const endpoint = this.endpoint();
    if (!endpoint) return { configured: false, provider: null };

    try {
      const url = new URL(endpoint);
      if (String(this.config.get<string>('NODE_ENV')).toLowerCase() === 'production' && url.protocol !== 'https:') {
        return { configured: false, provider: null };
      }
      return { configured: true, provider: url.hostname, protocol: provider };
    } catch {
      return { configured: false, provider: null };
    }
  }

  async execute(language: CodeRunnerLanguage, code: string, stdin = '') {
    const endpoint = this.endpoint();
    if (!endpoint) {
      throw new ServiceUnavailableException('Code runner is not configured. Set CODE_RUNNER_URL on the API service.');
    }

    const runtime = runtimeByLanguage[language];
    if (!runtime) throw new BadRequestException('This language is not available in the secure runner.');

    const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
    const token = this.config.get<string>('CODE_RUNNER_API_KEY')?.trim();
    if (token) {
      headers['X-Auth-Token'] = token;
      headers.Authorization = `Bearer ${token}`;
    }

    const { provider } = this.settings();
    if (provider === 'judge0') return this.executeJudge0(endpoint, runtime, code, stdin, headers);

    return this.executePiston(endpoint, runtime, code, stdin, headers);
  }

  private async executePiston(endpoint: string, runtime: Runtime, code: string, stdin: string, headers: Record<string, string>) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language: runtime.language,
          version: '*',
          files: [{ name: runtime.file, content: code }],
          stdin,
          compile_timeout: 10000,
          run_timeout: 3000,
          compile_cpu_time: 10000,
          run_cpu_time: 3000,
          compile_memory_limit: 128 * 1024 * 1024,
          run_memory_limit: 128 * 1024 * 1024,
        }),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('The secure code runner is unavailable. Please try again shortly.');
    }

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new ServiceUnavailableException(clampOutput(payload?.message, 500) || 'The secure code runner rejected the request.');
    }

    const compile = payload?.compile as RunnerStage | undefined;
    const run = payload?.run as RunnerStage | undefined;
    return {
      language: Object.entries(runtimeByLanguage).find(([, value]) => value === runtime)?.[0] || runtime.language,
      compile: compile ? this.stage(compile) : null,
      run: run ? this.stage(run) : null,
    };
  }

  private async executeJudge0(endpoint: string, runtime: Runtime, code: string, stdin: string, headers: Record<string, string>) {
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ language_id: runtime.judge0Id, source_code: code, stdin }),
        signal: AbortSignal.timeout(25000),
        redirect: 'error',
      });
    } catch {
      throw new ServiceUnavailableException('The secure code runner is unavailable. Please try again shortly.');
    }

    const payload = await response.json().catch(() => ({})) as Judge0Result & { error?: string };
    if (!response.ok) {
      throw new ServiceUnavailableException(clampOutput(payload?.error || payload?.message, 500) || 'The secure code runner rejected the request.');
    }
    if (payload.error) {
      throw new ServiceUnavailableException(clampOutput(payload.error, 500));
    }

    const statusId = Number(payload.status?.id || 0);
    const status = payload.status?.description || null;
    const compileOutput = clampOutput(payload.compile_output);
    const compile = compileOutput || statusId === 6
      ? this.stage({
          stderr: compileOutput || payload.message || status,
          code: 1,
          status,
          message: payload.message || status,
        })
      : null;
    const run = compile
      ? null
      : this.stage({
          stdout: payload.stdout,
          stderr: payload.stderr,
          code: statusId === 3 ? 0 : statusId ? 1 : null,
          status,
          message: payload.message || (statusId && statusId !== 3 ? status : null),
        });

    return {
      language: Object.entries(runtimeByLanguage).find(([, value]) => value === runtime)?.[0] || runtime.language,
      compile,
      run,
    };
  }

  private stage(stage: RunnerStage) {
    return {
      stdout: clampOutput(stage.stdout || stage.output),
      stderr: clampOutput(stage.stderr),
      code: stage.code ?? null,
      signal: stage.signal ?? null,
      status: stage.status ?? null,
      message: clampOutput(stage.message, 500) || null,
    };
  }
}
