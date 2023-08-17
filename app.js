const puppeteer = require('puppeteer-core');
const fs = require('fs');
const Sentiment = require('sentiment');

const sentiment = new Sentiment();

const SBR_WS_ENDPOINT = 'wss://YOUR_USERNAME:YOUR_PASSWORD@YOUR_HOST';

async function getReviews(page) {
  return await page.$$eval('.review', (reviews) => {
    return reviews.map((review) => {
      const reviewTextElement = review.querySelector(
        '.review-text-content span'
      );
      const reviewTitleElement = review.querySelector(
        '.review-title span:nth-child(3)'
      );
      const reviewDateElement = review.querySelector('.review-date');
      const reviewRatingElement = review.querySelector('.review-rating');

      return {
        reviewText: reviewTextElement ? reviewTextElement.innerText : null,
        reviewTitle: reviewTitleElement ? reviewTitleElement.innerText : null,
        reviewDate: reviewDateElement ? reviewDateElement.innerText : null,
        reviewRating: reviewRatingElement
          ? reviewRatingElement.innerText
          : null,
      };
    });
  });
}

function checkSentiments() {
  const reviews = JSON.parse(fs.readFileSync('reviews.json', 'utf-8'));
  const updatedReviews = reviews.map((review) => {
    const reviewText = review.reviewText;
    const reviewSentiment = sentiment.analyze(reviewText);

    return {
      ...review,
      reviewSentiment: reviewSentiment.score,
    };
  });

  fs.writeFileSync(
    'reviews.json',
    JSON.stringify(updatedReviews, null, 2),
    'utf-8'
  );
}

async function main() {
  console.log('Connecting to Scraping Browser...');
  const browser = await puppeteer.connect({
    browserWSEndpoint: SBR_WS_ENDPOINT,
  });
  try {
    console.log('Connected! Navigating to an Amazon product review page...');
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(2 * 60 * 1000);

    await page.goto(
      'https://www.amazon.com/Bike-Phone-Holder-Motorcycle-Mount/dp/B09MFP8SKN/ref=sr_1_301?keywords=bike+phone+mount&qid=1692258143&refinements=p_72%3A1248864011&rnid=1248859011&sprefix=bike+phone%2Caps%2C378&sr=8-301'
    ); // Replace with your specific Amazon product URL

    await new Promise((r) => setTimeout(r, 5000));

    console.log('Navigated! Scraping reviews...');
    const reviews = await getReviews(page);

    fs.writeFileSync('reviews.json', JSON.stringify(reviews, null, 2), 'utf-8');

    console.log('Scraped! Checking sentiments...');
    checkSentiments();

    console.log('Done!');
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
