import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import gfm from "remark-gfm";
import html from "remark-html";

const minutesDir = path.join(process.cwd(), "content/minutes");
const outDir = path.join(process.cwd(), "generated");
const outFile = path.join(outDir, "minutes.json");

async function buildMinutes() {
  fs.mkdirSync(outDir, { recursive: true });

  if (!fs.existsSync(minutesDir)) {
    fs.writeFileSync(outFile, "[]");
    return;
  }

  const files = fs.readdirSync(minutesDir).filter((f) => f.endsWith(".md"));

  const minutes = await Promise.all(
    files.map(async (filename) => {
      const slug = filename.replace(/\.md$/, "");
      const filePath = path.join(minutesDir, filename);
      const fileContents = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(fileContents);

      const processedContent = await remark().use(gfm).use(html).process(content);
      const contentHtml = processedContent.toString();

      return {
        slug,
        title: data.title ?? slug,
        date: data.date ?? "",
        attendees: data.attendees ?? [],
        topics: data.topics ?? [],
        contentHtml,
      };
    })
  );

  minutes.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  fs.writeFileSync(outFile, JSON.stringify(minutes, null, 2));
  console.log(`Built ${minutes.length} minutes entries → ${outFile}`);
}

buildMinutes();
