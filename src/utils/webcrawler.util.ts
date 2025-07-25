import axios from "axios";
import * as cheerio from "cheerio";
import { OpenAI } from "openai";
import { URL } from "url";

const visited = new Set<string>();
const summaries: string[] = [];

async function crawl(
  url: string,
  base: string,
  depth: number = 0,
  maxDepth: number = 2,
  maxPages: number = 30
): Promise<void> {
  if (visited.has(url) || depth > maxDepth || visited.size >= maxPages) return;
  visited.add(url);

  try {
    const { data } = await axios.get<string>(url, { timeout: 10000 });
    const $ = cheerio.load(data);

    const title = $("title").text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    const h1 = $("h1").first().text().trim();
    const h2s = $("h2")
      .map((_, el) => $(el).text().trim())
      .get()
      .slice(0, 5);

    const paras = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((p) => p.length > 40)
      .slice(0, 5);

    summaries.push([title, description, h1, ...h2s, ...paras].join("\n"));

    const links = $("a[href]")
      .map((_, el) => $(el).attr("href") ?? "")
      .get();

    for (const href of links) {
      try {
        const nextUrl = new URL(href, base).href;
        if (nextUrl.startsWith(base)) {
          await crawl(nextUrl, base, depth + 1, maxDepth, maxPages);
        }
      } catch {
        // Skip malformed URLs
      }
    }
  } catch (err: any) {
    console.error(`❌ Error at ${url}: ${err.message}`);
  }
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

async function summarizeWithOpenAI(text: string): Promise<string> {
  const prompt = `You are a professional web content analyst.

Your job is to deeply understand the purpose and content of the following website data. Based on the information, provide a detailed summary with the following points:

1. **Website Overview**: What is the primary purpose or mission of this website?
2. **Key Offerings**: What main services, products, tools, or features does it provide?
3. **Target Audience**: Who is this website primarily intended for? Be specific.
4. **Unique Value Proposition**: What makes this website or its offerings stand out from competitors?
5. **Content & Tone**: What is the tone and style of the content (e.g. professional, friendly, technical, sales-focused)?
6. **Notable Features**: Mention any standout sections, tools, or pages (e.g. blog, documentation, pricing, community, integrations).
7. **Call to Action**: What actions does the website encourage users to take?

Analyze the content provided below and write your response in a clear, structured format.

---

Website Content:
${text}`
;

  try {
    const result = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo"
      messages: [
        { role: "system", content: "You are a helpful website summarizer." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 800,
    });

    const content = result.choices[0]?.message?.content ?? "";
    console.log("\n📢 OpenAI Summary:\n");
    return content;
  } catch (err: any) {
    console.error("❌ OpenAI Error:", err.message);
    return "";
  }
}

export async function webcrawl(url: string): Promise<string> {
  const base = new URL(url).origin;
  await crawl(url, base);
  const content = summaries.join("\n\n").slice(0, 12000);
  const data = await summarizeWithOpenAI(content);
  return data;
}

// Example:
// webcrawl("https://vercel.com");
