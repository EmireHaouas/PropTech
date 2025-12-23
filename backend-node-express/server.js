const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Protection contre les requêtes simultanées
let isScraping = false;

// Route racine pour éviter "Cannot GET"
app.get('/', (req, res) => {
    res.json({ 
        message: "Serveur PropTech actif ! 🏠",
        endpoints: {
            test: "/api/test",
            scrape: "/api/scrape"
        }
    });
});

app.get('/api/test', (req, res) => {
    res.json({ message: "Le serveur de Sapporo est prêt ! ❄️" });
});

app.get('/api/scrape', async (req, res) => {
    // Protection contre les requêtes simultanées
    if (isScraping) {
        console.log("Scraping déjà en cours, requête ignorée");
        return res.status(429).json({ success: false, error: 'Un scraping est déjà en cours, veuillez patienter' });
    }
    
    isScraping = true;
    console.log("Lancement du scraper pour Hassamu...");
    let browser;
    let context;
    let page;

    try {
        browser = await chromium.launch({ 
            headless: true,
            args: ['--start-maximized', '--disable-blink-features=AutomationControlled']
        });
        
        // Créer un contexte avec user-agent pour éviter la détection de bot
        context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1920, height: 1080 }
        });
        
        page = await context.newPage();

        const searchUrl = 'https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=010&bs=040&cb=0.0&ct=9999999&mb=0&mt=9999999&et=9999999&cn=9999999&tc=0401303&tc=0401304&tc=0401102&shkr1=03&shkr2=03&shkr3=03&shkr4=03&sngz=&po1=25&pc=50';
        
        await page.goto(searchUrl, { waitUntil: 'load', timeout: 60000 });
        
        // Attendre que le réseau soit stable
        try {
            await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (e) {
            // Timeout normal, on continue
        }
        
        await page.waitForSelector('.cassetteitem', { timeout: 20000 });

        const houses = await page.$$eval('.cassetteitem', (elements) => {
            const isValidLink = (href) => {
                if (!href) return false;
                href = href.trim();
                return href && 
                       href !== 'javascript:void(0)' && 
                       href !== '#' && 
                       !href.startsWith('javascript:');
            };

            return elements.map((el) => {
                const title = el.querySelector('.cassetteitem_content-title')?.innerText || "Sans titre";
                const price = el.querySelector('.cassetteitem_price--rent')?.innerText || "N/A";
                
                // Chercher le lien valide dans plusieurs emplacements
                let link = null;
                const allLinks = el.querySelectorAll('a');
                
                for (const a of allLinks) {
                    const href = a.getAttribute('href');
                    if (isValidLink(href) && (href.includes('/chintai/jj_') || href.includes('/chintai/'))) {
                        link = href;
                        break;
                    }
                }

                // Construire l'URL finale
                let finalUrl = "Lien non disponible";
                if (link && isValidLink(link)) {
                    link = link.trim();
                    if (link.startsWith('http://') || link.startsWith('https://')) {
                        finalUrl = link;
                    } else if (link.startsWith('/')) {
                        finalUrl = `https://suumo.jp${link}`;
                    } else {
                        finalUrl = `https://suumo.jp/${link}`;
                    }
                }

                return {
                    title,
                    price,
                    url: finalUrl,
                    source: 'Suumo'
                };
            });
        });

        console.log(`Scraping terminé: ${houses.length} maisons trouvées`);
        res.json({ success: true, count: houses.length,  houses });

    } catch (error) {
        console.error("Erreur de scraping:", error);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        isScraping = false;
        if (browser) {
            try {
                await browser.close();
            } catch (closeError) {
                console.error("Erreur lors de la fermeture du navigateur:", closeError.message);
            }
        }
    }
});

app.listen(PORT, () => {
    console.log(`Serveur HDC lancé sur http://localhost:${PORT}`);
});
