import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import gfm from "remark-gfm";
import html from "remark-html";

const minutesDir = path.join(process.cwd(), "content/minutes");
const outDir = path.join(process.cwd(), "generated");
const outFile = path.join(outDir, "minutes.json");

function compareDateDescending(left, right) {
  return right.date.localeCompare(left.date);
}

async function renderMarkdown(markdown) {
  return remark().use(gfm).use(html).process(markdown);
}

async function loadMinutesEntry(filename) {
  const slug = filename.replace(/\.md$/, "");
  const filePath = path.join(minutesDir, filename);
  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);
  const contentHtml = (await renderMarkdown(content)).toString();

  return {
    slug,
    title: data.title ?? slug,
    date: data.date ?? "",
    attendees: data.attendees ?? [],
    topics: data.topics ?? [],
    contentHtml,
  };
}

async function buildMinutes() {
  fs.mkdirSync(outDir, { recursive: true });

  if (!fs.existsSync(minutesDir)) {
    fs.writeFileSync(outFile, "[]");
    return;
  }

  const files = fs.readdirSync(minutesDir).filter((f) => f.endsWith(".md"));
  const minutes = await Promise.all(files.map(loadMinutesEntry));

  minutes.sort(compareDateDescending);

  fs.writeFileSync(outFile, JSON.stringify(minutes, null, 2));
  console.log(`Built ${minutes.length} minutes entries → ${outFile}`);
}

buildMinutes();
