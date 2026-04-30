import { promises as fs } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const SEED_DIR = path.join(process.cwd(), 'content', 'seed-questions');

export interface Attribution {
  source: string;
  license: string;
  license_url: string;
  modifications: string;
}

export interface SeedSummary {
  slug: string;
  title: string;
  difficulty: 'L4' | 'L5' | 'L6';
}

export interface SeedQuestion extends SeedSummary {
  markdown: string;
  attribution: Attribution;
}

async function readAttribution(): Promise<Record<string, Attribution>> {
  const raw = await fs.readFile(path.join(SEED_DIR, '_attribution.json'), 'utf8');
  return JSON.parse(raw);
}

export async function loadAllSeedQuestions(): Promise<SeedSummary[]> {
  const files = await fs.readdir(SEED_DIR);
  const out: SeedSummary[] = [];
  for (const f of files) {
    if (!f.endsWith('.md')) continue;
    const raw = await fs.readFile(path.join(SEED_DIR, f), 'utf8');
    const { data } = matter(raw);
    out.push({
      slug: data.slug ?? f.replace(/\.md$/, ''),
      title: data.title,
      difficulty: data.difficulty,
    });
  }
  return out.sort((a, b) => a.title.localeCompare(b.title));
}

export async function loadSeedQuestion(slug: string): Promise<SeedQuestion | null> {
  const filePath = path.join(SEED_DIR, `${slug}.md`);
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const { data, content } = matter(raw);
    const attr = await readAttribution();
    if (!attr[slug]) return null;
    return {
      slug,
      title: data.title,
      difficulty: data.difficulty,
      markdown: content,
      attribution: attr[slug],
    };
  } catch {
    return null;
  }
}
