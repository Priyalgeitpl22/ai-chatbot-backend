import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";

interface PersonalData {
  url: string;
  emails: string[];
  phoneNumbers: string[];
  potentialNames: string[];
}

const visited = new Set<string>();
const collected: PersonalData[] = [];

function extractEmails(text: string): string[] {
  const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  return [...new Set(text.match(regex) || [])];
}

function extractPhoneNumbers(text: string): string[] {
  const regex = /\b(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}\b/g;
  return [...new Set(text.match(regex) || [])];
}

function extractNames(text: string): string[] {
  const regex = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\b/g;
  return [...new Set(text.match(regex) || [])];
}

async function crawl(
  url: string,
  base: string,
  header?:string|null|undefined,
  depth = 0,
  maxDepth = 2,
  maxPages = 30
): Promise<void> {
  if (visited.has(url) || depth > maxDepth || visited.size >= maxPages) return;
  visited.add(url);

  try {
    const { data } = await axios.get<string>(url, {
      timeout: 10000,
      headers: header ? { Cookie: header } : undefined,
    });
    const $ = cheerio.load(data);
    const text = $("body").text();

    const emails = extractEmails(text);
    const phones = extractPhoneNumbers(text);
    const names = extractNames(text);

    if (emails.length || phones.length || names.length) {
      collected.push({
        url,
        emails,
        phoneNumbers: phones,
        potentialNames: names,
      });
    }

    // Traverse links
    const links = $("a[href]")
      .map((_, el) => $(el).attr("href") ?? "")
      .get();

    for (const href of links) {
      try {
        const nextUrl = new URL(href, base).href;
        if (nextUrl.startsWith(base)) {
          await crawl(nextUrl, base, header,depth + 1, maxDepth, maxPages);
        }
      } catch {
        // Invalid/malformed link
      }
    }
  } catch (err: any) {
    console.error(`❌ Error at ${url}: ${err.message}`);
  }
}

export async function crawlForPersonalData(startUrl: string,header:string): Promise<PersonalData[]> {
  console.log(header,"hello")
  const base = new URL(startUrl).origin;
  visited.clear();
  collected.length = 0;
  await crawl(startUrl, base,header);

  return collected;
}

// Example usage
// (async () => {
//   const results = await crawlForPersonalData("https://example.com");
//   console.log(JSON.stringify(results, null, 2));
// })();
