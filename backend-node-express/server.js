const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let isScraping = false;

app.get('/', (req, res) => {
    res.json({
        message: "Serveur PropTech actif ! 🏠",
        endpoints: { test: "/api/test", scrape: "/api/scrape" }
    });
});

app.get('/api/scrape', async (req, res) => {
    if (isScraping) {
        return res.status(429).json({ success: false, error: 'Un scraping est déjà en cours' });
    }

    isScraping = true;
    console.log("Lancement du scraper avec récupération d'images...");

    let browser;
    try {
        browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        const searchUrl = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=010&bs=040&cb=0.0&ct=9999999&mb=0&mt=9999999&et=9999999&cn=9999999&tc=0401303&tc=0401304&tc=0401102&shkr1=03&shkr2=03&shkr3=03&shkr4=03&sngz=&po1=25&pc=50';

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('.cassetteitem', { timeout: 20000 });


        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                let distance = 400;
                let timer = setInterval(() => {
                    let scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });


        await page.waitForTimeout(2000);


        const firstElement = await page.$('.cassetteitem');
        if (firstElement) {
            const debugInfo = await firstElement.evaluate((el) => {
                const imgSelectors = [
                    '.cassetteitem_figure img',
                    '.cassetteitem_photo img',
                    'img',
                    '.cassetteitem_content img'
                ];
                
                let foundImg = null;
                for (const selector of imgSelectors) {
                    const img = el.querySelector(selector);
                    if (img) {
                        foundImg = {
                            selector: selector,
                            src: img.src,
                            dataSrc: img.getAttribute('data-src'),
                            dataLazySrc: img.getAttribute('data-lazy-src'),
                            currentSrc: img.currentSrc,
                            allAttrs: Array.from(img.attributes).map(a => ({name: a.name, value: a.value}))
                        };
                        break;
                    }
                }
                return foundImg;
            });
            console.log('Debug image structure:', JSON.stringify(debugInfo, null, 2));
        }


        const houses = await page.$$eval('.cassetteitem', (elements) => {
            return elements.map((el) => {
                const title = el.querySelector('.cassetteitem_content-title')?.innerText || "Sans titre";
                const price = el.querySelector('.cassetteitem_price--rent')?.innerText || "N/A";


                let imageUrl = null;
                const imgSelectors = [
                    '.cassetteitem_figure img',
                    '.cassetteitem_photo img',
                    'img',
                    '.cassetteitem_content img'
                ];
                
                for (const selector of imgSelectors) {
                    const imgNode = el.querySelector(selector);
                    if (imgNode) {

                        imageUrl = imgNode.currentSrc || 
                                  imgNode.src || 
                                  imgNode.getAttribute('data-src') ||
                                  imgNode.getAttribute('data-lazy-src') ||
                                  imgNode.getAttribute('data-original');
                        

                        if (imageUrl && 
                            imageUrl !== '' && 
                            !imageUrl.includes('data:image') && 
                            !imageUrl.includes('placeholder') &&
                            !imageUrl.includes('blank')) {
                            break;
                        }
                    }
                }


                let finalUrl = "Lien non disponible";
                const linkNode = el.querySelector('.cassetteitem_content-title a') || el.querySelector('a');
                if (linkNode && linkNode.getAttribute('href')) {
                    const href = linkNode.getAttribute('href');
                    finalUrl = href.startsWith('http') ? href : `https://suumo.jp${href}`;
                }

                return {
                    title,
                    price,
                    image: imageUrl,
                    url: finalUrl,
                    source: 'Suumo'
                };
            });
        });

        console.log(`Scraping terminé: ${houses.length} annonces avec images.`);
        res.json({ success: true, count: houses.length, houses });

    } catch (error) {
        console.error("Erreur de scraping:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        isScraping = false;
        if (browser) await browser.close();
    }
});

app.listen(PORT, () => {
    console.log(`Serveur HDC lancé sur http://localhost:${PORT}`);
});