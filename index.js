const express = require("express");
const { chromium } = require("playwright-extra");
const stealth = require("playwright-extra-plugin-stealth")();
chromium.use(stealth);

const app = express();
const port = process.env.PORT || 3000;

async function scrapeJobs(searchTerm, location) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const searchUrl = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}&f_AL=true`;

  await page.goto(searchUrl, { waitUntil: "networkidle", timeout: 60000 });

  // Scroll to load more jobs
  await page.evaluate(async () => {
    for (let i = 0; i < 5; i++) {
      window.scrollBy(0, window.innerHeight);
      await new Promise(r => setTimeout(r, 1000));
    }
  });

  // Scrape job data
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
  const searchTerm = req.query.term || "Graduate Trader";
  const location = req.query.location || "London";

  try {
    const jobs = await scrapeJobs(searchTerm, location);
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: "Scraping failed", details: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("LinkedIn Scraper is running. Use /scrape?term=YOUR_JOB&location=YOUR_CITY to get data.");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
