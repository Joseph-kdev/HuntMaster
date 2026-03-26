if (!window.JOB_TRACKER_LOADED) {
    window.JOB_TRACKER_LOADED = true;

    console.log('Job Tracker content script loaded');

    const SCRAPERS = {
        'linkedin.com': () => {
            // Selectors for LinkedIn's various job views (Collections, Search, Direct)
            const titleSelectors = [
                '.job-details-jobs-unified-top-card__job-title',
                '.jobs-unified-top-card__job-title',
                'h1.t-24',
                '.jobs-details-top-card__job-title',
            ];

            const companySelectors = [
                '.job-details-jobs-unified-top-card__company-name',
                '.jobs-unified-top-card__company-name',
                '.jobs-details-top-card__company-info a',
            ];

            const findText = (selectors) => {
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) return el.innerText.trim();
                }
                return null;
            };

            const descriptionSelectors = [
                '#job-details',
                '.jobs-description__content',
                '.jobs-description-content__text',
                '.job-view-layout .jobs-description'
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                url: window.location.href,
                description: findText(descriptionSelectors) || '',
            };
        },
        'foorilla.com': () => {
            const container = document.querySelector('#mc_2');
            if (!container) return {};

            // Company is often in a link with /hiring/companies/ or the first div in the hstack
            const companyEl = container.querySelector('a[href*="/hiring/companies/"]');
            const locationEl = container.querySelector('.hstack div:first-child');

            // Description extraction: clone to remove title/meta if possible, or just take the whole container text
            // A simple heuristic is to take the whole container text as it contains the rich description
            const description = container.innerText;

            return {
                title: container.querySelector('h1')?.innerText || '',
                company: companyEl ? companyEl.innerText.replace('@', '').trim() : (locationEl?.innerText || ''),
                url: window.location.href,
                description: description
            };
        },
        'generic': () => {
            const getMeta = (name) => document.querySelector(`meta[name="${name}"], meta[property="${name}"]`)?.content;

            // Try to find the main article or generic content containers
            const descriptionSelectors = [
                'article',
                'main',
                '.job-description',
                '#job-description',
                '.description'
            ];

            const findText = (selectors) => {
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) return el.innerText.trim();
                }
                return null;
            };

            return {
                title: document.querySelector('h1')?.innerText || document.title,
                company: getMeta('og:site_name') || '',
                url: window.location.href,
                description: findText(descriptionSelectors) || getMeta('description') || '',
            };
        }
    };

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'SCRAPE_JOB') {
            try {
                const hostname = window.location.hostname;
                let data = {};

                if (hostname.includes('linkedin.com')) {
                    data = SCRAPERS['linkedin.com']();
                } else if (hostname.includes('foorilla.com')) {
                    data = SCRAPERS['foorilla.com']();
                }

                // Fallback if specific scraping failed or not matched
                if (!data.title) {
                    data = { ...data, ...SCRAPERS['generic']() };
                }

                sendResponse(data);
            } catch (error) {
                console.error('Job Tracker Scraping Error:', error);
                sendResponse({ error: error.message });
            }
        }
        return true;
    });
}
