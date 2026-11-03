import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CodeRunnerLanguage } from './dto/run-code.dto';

type RunnerStage = {
  stdout?: string;
  stderr?: string;
  output?: string;
  code?: number | null;
  signal?: string | null;
  status?: string | null;
  message?: string | null;
};

const runtimeByLanguage: Record<CodeRunnerLanguage, { language: string; file: string }> = {
  c: { language: 'c', file: 'main.c' },
  cpp: { language: 'c++', file: 'main.cpp' },
  csharp: { language: 'csharp', file: 'Program.cs' },
  dart: { language: 'dart', file: 'main.dart' },
  java: { language: 'java', file: 'Main.java' },
  javascript: { language: 'javascript', file: 'main.js' },
  kotlin: { language: 'kotlin', file: 'Main.kt' },
  php: { language: 'php', file: 'main.php' },
  python: { language: 'python', file: 'main.py' },
  shell: { language: 'bash', file: 'main.sh' },
  sql: { language: 'sqlite3', file: 'main.sql' },
};

const clampOutput = (value: unknown, max = 8000) => String(value ?? '').slice(0, max);

@Injectable()
export class CodeRunnerService {
  constructor(private readonly config: ConfigService) {}

  private endpoint() {
    const configured = this.config.get<string>('CODE_RUNNER_URL')?.trim().replace(/\/$/, '');
    if (!configured) return '';
    return configured.endsWith('/execute') ? configured : `${configured}/api/v2/execute`;
  }

  configuration() {
    const endpoint = this.endpoint();
    if (!endpoint) return { configured: false, provider: null };

    try {
      return { configured: true, provider: new URL(endpoint).hostname };
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
      language,
      compile: compile ? this.stage(compile) : null,
      run: run ? this.stage(run) : null,
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
