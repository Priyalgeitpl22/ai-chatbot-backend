import axios from "axios";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";
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

async function summarizeWithGemini(text: string): Promise<string> {
  const apiKey =process.env.GOOGLE_API_KEY;

  const genAI = new GoogleGenerativeAI(apiKey||"");
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
You are a website analyzer. Read the content and answer:

1. What is this website about?
2. What services or products does it provide?
3. Who might benefit from this site?

Website Content:
${text}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    console.log("\n📢 Gemini Summary:\n");
    // console.log(response.text())
    return response.text()
  } catch (err: any) {
    console.error("❌ Gemini Error:", err.message);
    return ""
    
  }
}

export async function webcrawl(url: string): Promise<string> {
  const base = new URL(url).origin;
  await crawl(url, base);
  const content = summaries.join("\n\n").slice(0, 12000);
  const data =await summarizeWithGemini(content);
  return data
}

// Test
// webcrawl("https://vercel.com");
