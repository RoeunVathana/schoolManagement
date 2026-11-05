import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const CODE_RUNNER_LANGUAGES = [
  'c',
  'cpp',
  'csharp',
  'dart',
  'go',
  'java',
  'javascript',
  'kotlin',
  'laravel',
  'node',
  'php',
  'python',
  'rust',
  'shell',
  'sql',
  'swift',
] as const;

export type CodeRunnerLanguage = (typeof CODE_RUNNER_LANGUAGES)[number];

export class RunCodeDto {
  @IsIn(CODE_RUNNER_LANGUAGES)
  language!: CodeRunnerLanguage;

  @IsString()
  @MinLength(1)
  @MaxLength(24000)
  code!: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  stdin?: string;
}
