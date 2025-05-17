const express = require("express");
const { chromium } = require("playwright");
const app = express();
const port = process.env.PORT || 3000;

async function scrapeJobs() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const searchUrl = "https://www.linkedin.com/jobs/search/?keywords=Graduate%20Trader&location=London%2C%20England%2C%20United%20Kingdom&f_AL=true";

  await page.goto(searchUrl, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (let i = 0; i < 5; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise(r => setTimeout(r, 1000));
    }
  });

  const jobs = await page.$$eval(".jobs-search-results__list-item", nodes =>
    nodes.map(node => {
      const title = node.querySelector("h3")?.innerText?.trim() || "N/A";
      const company = node.querySelector("h4")?.innerText?.trim() || "N/A";
      const link = node.querySelector("a")?.href || "";
      const easyApply = node.innerText.includes("Easy Apply");
      return easyApply ? { title, company, link } : null;
    }).filter(job => job !== null)
  );

  await browser.close();
  return jobs;
}

app.get("/scrape", async (req, res) => {
  try {
    const jobs = await scrapeJobs();
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: "Scraping failed", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("LinkedIn Scraper is running. Use /scrape to get data.");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
