import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MAX_UNITS = 120;
const MAX_LESSONS_PER_UNIT = 120;
const MAX_LESSONS = 6000;

type AnyRecord = Record<string, any>;

function asText(value: unknown, max: number, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value).trim().slice(0, max);
}

function asStringList(value: unknown, maxItems = 20, maxLength = 120) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => asText(item, maxLength)).filter(Boolean).slice(0, maxItems);
}

function slugPart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}

function normalizeLesson(value: unknown, unitNumber: string, index: number): AnyRecord {
  const item = value && typeof value === 'object' ? value as AnyRecord : {};
  const fallbackId = `${slugPart(unitNumber) || 'unit'}-lesson-${index + 1}`;
  const preview = item.preview && typeof item.preview === 'object' ? item.preview as AnyRecord : {};
  return {
    id: asText(item.id, 120, fallbackId),
    label: asText(item.label, 240, `Lesson ${index + 1}`),
    heading: asText(item.heading, 240, asText(item.label, 240, `Lesson ${index + 1}`)),
    intro: asText(item.intro, 20000),
    bodyHeading: asText(item.bodyHeading, 240, 'Lesson notes'),
    body: asText(item.body, 30000),
    code: asText(item.code, 30000),
    preview: {
      title: asText(preview.title, 240, asText(item.heading, 240, `Lesson ${index + 1}`)),
      body: asText(preview.body, 4000),
    },
    keywords: asStringList(item.keywords),
    objectives: asStringList(item.objectives, 20, 300),
    sourceFile: asText(item.sourceFile, 240),
  };
}

function normalizeCourse(input: unknown, slugParam?: string) {
  const value = input && typeof input === 'object' ? input as AnyRecord : {};
  const slug = asText(slugParam || value.slug, 100).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]*$/i.test(slug)) throw new BadRequestException('A valid programming course slug is required.');
  const title = asText(value.title, 240);
  if (!title) throw new BadRequestException('A programming course title is required.');
  const rawUnits = Array.isArray(value.lessons) ? value.lessons : Array.isArray(value.units) ? value.units : [];
  if (rawUnits.length > MAX_UNITS) throw new BadRequestException(`A course can contain at most ${MAX_UNITS} units.`);
  let totalLessons = 0;
  const lessons = rawUnits.map((rawUnit, unitIndex) => {
    const unit = rawUnit && typeof rawUnit === 'object' ? rawUnit as AnyRecord : {};
    const number = asText(unit.number, 40, String(unitIndex + 1));
    const rawItems = Array.isArray(unit.items) ? unit.items : Array.isArray(unit.lessons) ? unit.lessons : [];
    if (rawItems.length > MAX_LESSONS_PER_UNIT) throw new BadRequestException(`Unit ${number} contains too many lessons.`);
    totalLessons += rawItems.length;
    return {
      number,
      title: asText(unit.title, 240, `Unit ${number}`),
      items: rawItems.map((item, lessonIndex) => normalizeLesson(item, number, lessonIndex)),
    };
  });
  if (totalLessons > MAX_LESSONS) throw new BadRequestException(`A course can contain at most ${MAX_LESSONS} lessons.`);
  return {
    slug,
    title,
    description: asText(value.description, 4000),
    codeLabel: asText(value.codeLabel, 120, 'example.txt'),
    tip: asText(value.tip, 4000),
    lessons,
    ...(value.pdfSource && typeof value.pdfSource === 'object' ? {
      pdfSource: {
        fileName: asText(value.pdfSource.fileName, 240),
        pageCount: Math.max(0, Math.min(100000, Number(value.pdfSource.pageCount) || 0)),
      },
    } : {}),
  };
}

@Injectable()
export class ProgrammingContentService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(slug: string) {
    const row = await this.prisma.programmingCourseContent.findUnique({ where: { slug: slug.toLowerCase() } });
    if (!row) throw new NotFoundException('No managed curriculum exists for this language.');
    return row.content;
  }

  async listAdmin() {
    const rows = await this.prisma.programmingCourseContent.findMany({ orderBy: [{ title: 'asc' }] });
    return rows.map((row) => {
      const content = row.content && typeof row.content === 'object' ? row.content as AnyRecord : {};
      const units = Array.isArray(content.lessons) ? content.lessons : [];
      return {
        slug: row.slug,
        title: row.title,
        description: row.description,
        updatedAt: row.updatedAt,
        unitCount: units.length,
        lessonCount: units.reduce((total, unit) => total + (Array.isArray(unit?.items) ? unit.items.length : 0), 0),
      };
    });
  }

  async getAdmin(slug: string) {
    const row = await this.prisma.programmingCourseContent.findUnique({ where: { slug: slug.toLowerCase() } });
    if (!row) throw new NotFoundException('No saved curriculum exists for this language.');
    return row.content;
  }

  async create(body: unknown, userId: string) {
    const content = normalizeCourse(body);
    const existing = await this.prisma.programmingCourseContent.findUnique({ where: { slug: content.slug } });
    if (existing) throw new ConflictException('This language already has saved curriculum. Use update instead.');
    const row = await this.prisma.programmingCourseContent.create({
      data: {
        slug: content.slug,
        title: content.title,
        description: content.description || null,
        codeLabel: content.codeLabel || null,
        tip: content.tip || null,
        content,
        createdById: userId,
      },
    });
    return row.content;
  }

  async update(slug: string, body: unknown) {
    const content = normalizeCourse(body, slug.toLowerCase());
    const existing = await this.prisma.programmingCourseContent.findUnique({ where: { slug: slug.toLowerCase() } });
    if (!existing) throw new NotFoundException('No saved curriculum exists for this language.');
    const row = await this.prisma.programmingCourseContent.update({
      where: { slug: slug.toLowerCase() },
      data: {
        title: content.title,
        description: content.description || null,
        codeLabel: content.codeLabel || null,
        tip: content.tip || null,
        content,
      },
    });
    return row.content;
  }

  async remove(slug: string) {
    const existing = await this.prisma.programmingCourseContent.findUnique({ where: { slug: slug.toLowerCase() }, select: { id: true } });
    if (!existing) throw new NotFoundException('No saved curriculum exists for this language.');
    await this.prisma.programmingCourseContent.delete({ where: { id: existing.id } });
    return { slug: slug.toLowerCase(), removed: true };
  }
}
