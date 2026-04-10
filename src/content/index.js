if (!window.JOB_TRACKER_LOADED) {
    window.JOB_TRACKER_LOADED = true;

    console.log('HuntMaster content script loaded');

    // =========================================================================
    // SHARED UTILITIES
    // =========================================================================

    /**
     * Attempt to find text content using a prioritized list of CSS selectors.
     * Returns the trimmed innerText of the first match, or null if none found.
     */
    const findText = (selectors, root = document) => {
        for (const sel of selectors) {
            try {
                const el = root.querySelector(sel);
                if (el) {
                    const text = el.innerText?.trim();
                    if (text) return text;
                }
            } catch (e) {
                // Invalid selector — skip silently
            }
        }
        return null;
    };

    /**
     * Extract clean, readable text from an element.
     * Strips excessive whitespace and normalizes newlines.
     */
    const cleanText = (text) => {
        if (!text) return '';
        return text
            .replace(/\r\n/g, '\n')       // Normalize line endings
            .replace(/\t/g, ' ')           // Tabs → spaces
            .replace(/ {2,}/g, ' ')        // Collapse multiple spaces
            .replace(/\n{3,}/g, '\n\n')    // Collapse excessive newlines
            .trim();
    };

    /**
     * Extract text from an element, removing all HTML tags.
     * Useful for job descriptions that contain rich HTML.
     */
    const extractCleanDescription = (selectors, root = document) => {
        for (const sel of selectors) {
            try {
                const el = root.querySelector(sel);
                if (el) {
                    const text = cleanText(el.innerText);
                    if (text && text.length > 30) return text; // Must be meaningful
                }
            } catch (e) { /* skip */ }
        }
        return '';
    };

    /**
     * Get content from a meta tag by name or property.
     */
    const getMeta = (name) => {
        const el = document.querySelector(
            `meta[name="${name}"], meta[property="${name}"], meta[itemprop="${name}"]`
        );
        return el?.content?.trim() || null;
    };

    /**
     * Get the href of the first matching link element.
     */
    const findHref = (selectors, root = document) => {
        for (const sel of selectors) {
            try {
                const el = root.querySelector(sel);
                if (el) {
                    const href = el.href || el.getAttribute('href');
                    if (href) return href;
                }
            } catch (e) { /* skip */ }
        }
        return null;
    };

    /**
     * Safely wraps a scraper function so one broken scraper can never
     * crash the entire extension.
     */
    const safeScrape = (name, scraperFn) => {
        try {
            const result = scraperFn();
            if (result && result.title) {
                console.log(`[HuntMaster] Successfully scraped from ${name}`);
                return result;
            }
            console.warn(`[HuntMaster] ${name} scraper returned no title — falling back`);
            return null;
        } catch (error) {
            console.error(`[HuntMaster] ${name} scraper failed:`, error);
            return null;
        }
    };


    // =========================================================================
    // SITE-SPECIFIC SCRAPERS
    // =========================================================================

    const SCRAPERS = {

        // =====================================================================
        // 1. LINKEDIN — Already battle-tested
        // =====================================================================
        'linkedin.com': () => {
            // LinkedIn uses multiple job view layouts (Collections, Search, Direct).
            // Each has slightly different class names, so we provide fallbacks.
            const titleSelectors = [
                '.job-details-jobs-unified-top-card__job-title',     // Current unified card
                '.jobs-unified-top-card__job-title',                 // Older unified card
                'h1.t-24',                                          // Generic heading fallback
                'h1.t-20',                                          // Smaller heading variant
                '.jobs-details-top-card__job-title',                 // Legacy layout
                'h1[class*="job-title"]',                            // Catch-all
            ];

            const companySelectors = [
                '.job-details-jobs-unified-top-card__company-name',  // Current
                '.jobs-unified-top-card__company-name',              // Older
                '.jobs-details-top-card__company-info a',            // Legacy with link
                'a[data-tracking-control-name="public_jobs_topcard-org-name"]', // Public view
                '.jobs-details-top-card__company-name',
            ];

            const locationSelectors = [
                '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
                '.jobs-unified-top-card__bullet',
                '.jobs-details-top-card__bullet',
                'span.tvm__text',
            ];

            const descriptionSelectors = [
                '#job-details',                                      // Most reliable — stable ID
                '.jobs-description__content',
                '.jobs-description-content__text',
                '.job-view-layout .jobs-description',
                '.jobs-box__html-content',
            ];

            const salarySelectors = [
                '.job-details-jobs-unified-top-card__job-insight--highlight span',
                '.salary-main-rail__current-range',
                '#SALARY',
                'li.job-criteria__item:has(.job-criteria__subheader:-soup-contains("Salary"))',
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                location: findText(locationSelectors),
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: getMeta('date') || '',
            };
        },


        // =====================================================================
        // 2. FOORILLA — Existing, enhanced with more fallbacks
        // =====================================================================
        'foorilla.com': () => {
            const container = document.querySelector('#mc_2');
            if (!container) {
                console.warn('[HuntMaster] Foorilla: #mc_2 container not found');
                return null;
            }

            const companyEl = container.querySelector('a[href*="/hiring/companies/"]');
            const title = container.querySelector('h1')?.innerText?.trim() || '';
            const company = companyEl
                ? companyEl.innerText.replace('@', '').trim()
                : (container.querySelector('.hstack div:first-child')?.innerText?.trim() || '');
            const description = cleanText(container.innerText);

            return {
                title,
                company,
                location: findText(['.hstack .text-muted', '.location-badge'], container) || '',
                salary: null,
                url: window.location.href,
                description,
                snippet: description.substring(0, 200),
                datePosted: '',
            };
        },


        // =====================================================================
        // 3. INDEED — The world's largest job board
        // Notes: Indeed uses React with data-testid attributes but also
        // frequently rotates class names. We prioritize data-testid and
        // aria-labels which are more stable (used for testing/a11y).
        // =====================================================================
        'indeed.com': () => {
            // Safety: Ensure we're on a job detail page, not search results
            const isJobPage =
                window.location.pathname.includes('/viewjob') ||
                window.location.pathname.includes('/jobs/') ||
                window.location.search.includes('vjk=') ||
                document.querySelector('[data-testid="jobsearch-ViewjobPage"]') ||
                document.querySelector('.jobsearch-ViewJobLayout');

            if (!isJobPage) {
                console.warn('[HuntMaster] Indeed: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                // data-testid is the most stable on Indeed
                '[data-testid="jobsearch-JobInfoHeader-title"]',
                'h1.jobsearch-JobInfoHeader-title',
                '.jobsearch-JobInfoHeader-title',
                'h2[data-testid="simpleHeader-title"]',
                // Fallback: broad heading in the job view container
                '.jobsearch-ViewJobLayout h1',
                'h1[class*="JobInfoHeader"]',
                // Last resort — the first h1 on the page
                'h1',
            ];

            const companySelectors = [
                '[data-testid="inlineHeader-companyName"]',
                '[data-testid="jobsearch-InlineCompanyRating"]',
                'div[data-company-name="true"]',
                '[data-testid="companyInfo-companyName"]',
                '.jobsearch-InlineCompanyRating a',
                '.jobsearch-InlineCompanyRating div:first-child',
                '.jobsearch-CompanyInfoContainer a',
                // Sometimes the company is in a simple div with no testid
                '.jobsearch-ViewJobLayout [data-testid="inlineHeader-companyName"] a',
            ];

            const locationSelectors = [
                '[data-testid="inlineHeader-companyLocation"]',
                '[data-testid="jobsearch-JobInfoHeader-companyLocation"]',
                '[data-testid="job-location"]',
                '.jobsearch-InlineCompanyRating + div',
                '#jobLocationText',
                '.jobsearch-JobInfoHeader-subtitle > div:last-child',
            ];

            const salarySelectors = [
                '[data-testid="attribute_snippet_testid"]',
                '#salaryInfoAndJobType',
                '.jobsearch-JobMetadataHeader-item',
                '.salary-snippet-container',
                '.jobsearch-SalaryInfoAndJobType span',
                '.attribute_snippet',
            ];

            const descriptionSelectors = [
                '#jobDescriptionText',                      // Most reliable — stable ID
                '[data-testid="jobDescriptionText"]',
                '.jobsearch-jobDescriptionText',
                '.jobsearch-JobComponent-description',
                '#jobDescription',
            ];

            const dateSelectors = [
                '.jobsearch-HiringInsights-entry--bullet',
                '[data-testid="myJobsStateDate"]',
                '.date',
            ];

            // Indeed sometimes nests company name inside a link
            let company = findText(companySelectors);
            if (company) {
                // Clean up rating text that sometimes appends (e.g. "Acme Corp3.5")
                company = company.replace(/\d+\.?\d*\s*$/, '').trim();
            }

            return {
                title: findText(titleSelectors),
                company,
                location: findText(locationSelectors),
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: findText(dateSelectors) || getMeta('datePosted') || '',
            };
        },


        // =====================================================================
        // 4. GLASSDOOR — Popular for company reviews + jobs
        // Notes: Glassdoor uses a React SPA with data-test attributes.
        // The job detail page can appear in a modal overlay or a standalone page.
        // =====================================================================
        'glassdoor.com': () => {
            const isJobPage =
                window.location.pathname.includes('/job-listing/') ||
                window.location.pathname.includes('/Job/') ||
                window.location.pathname.includes('/partner/jobListing') ||
                document.querySelector('[data-test="job-title"]') ||
                document.querySelector('[data-test="employerName"]');

            if (!isJobPage) {
                console.warn('[HuntMaster] Glassdoor: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '[data-test="job-title"]',
                '[data-test="jobTitle"]',
                '.job-title',
                '.e1tk4kwz5',                              // Dynamic class - less stable
                'h1[class*="JobDetails"]',
                '.css-1vg6q84',                             // Glassdoor heading
                // Modal view
                '.JobDetails h1',
                '#MainCol .job-title',
                'h1',
            ];

            const companySelectors = [
                '[data-test="employerName"]',
                '[data-test="employer-name"]',
                '.e1tk4kwz1',
                '.employerName',
                '.css-87uc0g',
                '.JobDetails .employer-name',
                'a[data-test="employerName-link"]',
                // Sometimes in a span within the employer section
                '.employer-header a',
            ];

            const locationSelectors = [
                '[data-test="location"]',
                '[data-test="emp-location"]',
                '.e1tk4kwz4',
                '.location',
                '.css-56kyx5',
                '.JobDetails .location',
                'span[class*="location"]',
            ];

            const salarySelectors = [
                '[data-test="detailSalary"]',
                '[data-test="salary-estimate"]',
                '.css-1bluz6i',
                '.salary-estimate',
                '.SalaryEstimate',
                '.e1wijj170',
                'span[data-test="detailSalary"]',
            ];

            const descriptionSelectors = [
                '[data-test="description"]',               // Most stable
                '.jobDescriptionContent',
                '.desc',
                '.job-desc-content',
                '#JobDescriptionContainer',
                '.JobDetails .desc',
                'div[class*="JobDescription"]',
                '.css-r3emm1',
            ];

            // Clean company name (Glassdoor sometimes appends rating)
            let company = findText(companySelectors);
            if (company) {
                company = company.replace(/\s*\d+\.?\d*\s*★?$/, '').trim();
            }

            return {
                title: findText(titleSelectors),
                company,
                location: findText(locationSelectors),
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: getMeta('datePosted') || '',
            };
        },


        // =====================================================================
        // 5. ZIPRECRUITER — Large US-focused board
        // Notes: ZipRecruiter uses aria-labels and data-testid extensively.
        // Job pages can be at /jobs/, /c/, or have ?lvk= in search results.
        // =====================================================================
        'ziprecruiter.com': () => {
            const isJobPage =
                window.location.pathname.startsWith('/jobs/') ||
                window.location.pathname.startsWith('/c/') ||
                document.querySelector('[data-testid="job-title"]') ||
                document.querySelector('.job_header') ||
                document.querySelector('article.job_content');

            if (!isJobPage) {
                console.warn('[HuntMaster] ZipRecruiter: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '[data-testid="job-title"]',
                'h1.job_title',
                '.job_header h1',
                '.job-title',
                'h1[class*="JobTitle"]',
                'article.job_content h1',
                '.hiring-entity h1',
                'h1',
            ];

            const companySelectors = [
                '[data-testid="job-company-name"]',
                'a.job_company_name',
                '.job_header .company_name',
                '.hiring-entity a[href*="/c/"]',
                'a[data-testid="employer-name"]',
                '.company-name',
                '.t_company_name',
                '[class*="companyName"]',
            ];

            const locationSelectors = [
                '[data-testid="job-location"]',
                '.job_header .location',
                '.job_location',
                '.location_text',
                '[class*="jobLocation"]',
                'span[class*="location"]',
            ];

            const salarySelectors = [
                '[data-testid="job-salary"]',
                '.job_header .salary',
                '.salary-range',
                '.compensation',
                '[class*="salary"]',
                '[class*="Salary"]',
            ];

            const descriptionSelectors = [
                '[data-testid="job-description"]',
                '.job_description',
                '.jobDescriptionSection',
                '#job-description-content',
                '.job_details .job_description_text',
                'article.job_content .job_description',
                '[class*="Description"]',
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                location: findText(locationSelectors),
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: findText(['.job_header .posted_time', '.posted-time', '[data-testid="posted-time"]']) || '',
            };
        },


        // =====================================================================
        // 6. MONSTER — Legacy global board, recently revamped
        // Notes: Monster was rebuilt as a React SPA circa 2023–2024.
        // They use data-testid and semantic class names.
        // =====================================================================
        'monster.com': () => {
            const isJobPage =
                window.location.pathname.includes('/job-openings/') ||
                window.location.pathname.includes('/job/') ||
                window.location.pathname.includes('/listing/') ||
                document.querySelector('[data-testid="jobTitle"]') ||
                document.querySelector('.job-detail');

            if (!isJobPage) {
                console.warn('[HuntMaster] Monster: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '[data-testid="jobTitle"]',
                'h1[data-testid="jobTitle"]',
                '.JobViewTitle h1',
                '.job-title-text',
                'h1.title',
                '.details-pane h1',
                'h1[class*="JobView"]',
                'h1',
            ];

            const companySelectors = [
                '[data-testid="company"]',
                '.job-detail .company',
                '.JobViewHeaderCompany a',
                'a[data-testid="companyName"]',
                '.company-name',
                '.details-pane .company',
                'h2[class*="Company"]',
            ];

            const locationSelectors = [
                '[data-testid="jobDetailLocation"]',
                '[data-testid="location"]',
                '.job-detail .location',
                '.JobViewHeaderLocation',
                '.location-text',
                '.details-pane .location',
            ];

            const salarySelectors = [
                '[data-testid="jobDetailSalary"]',
                '[data-testid="salary"]',
                '.salary-info',
                '.JobViewHeaderSalary',
                '.salary',
            ];

            const descriptionSelectors = [
                '[data-testid="svx-jobview-description"]',
                '#TextViewForJobBody',
                '.job-description',
                '.details-pane .description',
                '.JobViewDescription',
                '#JobDescription',
                '[class*="descriptionText"]',
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                location: findText(locationSelectors),
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: findText(['[data-testid="datePosted"]', '.posted-date', '.job-detail .date']) || '',
            };
        },


        // =====================================================================
        // 7. WELLFOUND (formerly AngelList Talent) — Startup/tech jobs
        // Notes: Wellfound is a React SPA. They use data-test attributes
        // and relatively stable semantic class names for job postings.
        // =====================================================================
        'wellfound.com': () => {
            const isJobPage =
                window.location.pathname.includes('/jobs/') ||
                window.location.pathname.includes('/l/') ||
                document.querySelector('[data-test="JobDetail"]') ||
                document.querySelector('.job-listing');

            if (!isJobPage) {
                console.warn('[HuntMaster] Wellfound: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '[data-test="jobTitle"]',
                'h1[data-test="job-title"]',
                '.styles_title__GJbvM',                    // Hash-based class (fragile, but current)
                '.job-listing h1',
                '.job-detail h1',
                'h1[class*="title"]',
                'h1',
            ];

            const companySelectors = [
                '[data-test="companyName"]',
                '[data-test="company-name"]',
                'a[class*="company-name"]',
                '.styles_companyName__GoECZ',
                '.job-listing .company-name',
                'h2[class*="company"]',
                'a[href*="/company/"]',
            ];

            const locationSelectors = [
                '[data-test="location"]',
                '.styles_location__vLaCv',
                '.job-listing .location',
                '[class*="LocationTag"]',
                'span[class*="location"]',
                // Wellfound often shows "Remote" as location
                'span:has(svg[data-testid="LocationIcon"])',
            ];

            const salarySelectors = [
                '[data-test="compensation"]',
                '[data-test="salary"]',
                '.styles_compensation__GVaKp',
                '.compensation',
                'span[class*="salary"]',
                'span[class*="compensation"]',
            ];

            const descriptionSelectors = [
                '[data-test="JobDescription"]',
                '[data-test="job-description"]',
                '.styles_description__9yBn8',
                '.job-description',
                '.job-listing .description',
                '.job-detail .description',
                'div[class*="Description"]',
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                location: findText(locationSelectors),
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: findText(['[data-test="posted-date"]', '.posted-date', 'time']) || '',
            };
        },


        // =====================================================================
        // 8. CAREERBUILDER — Long-standing global job board
        // Notes: CareerBuilder uses data-cb-* attributes and well-structured
        // semantic HTML with ARIA labels.
        // =====================================================================
        'careerbuilder.com': () => {
            const isJobPage =
                window.location.pathname.includes('/job/') ||
                window.location.pathname.includes('/job-') ||
                document.querySelector('[data-cb-component="job-detail"]') ||
                document.querySelector('.data-display-header_title');

            if (!isJobPage) {
                console.warn('[HuntMaster] CareerBuilder: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '[data-cb="job-title"]',
                'h1.data-display-header_title',
                '.data-display-header_title',
                'h1.jdp-header-title',
                '.jdp-header h1',
                'h2.job-title',
                'h1[class*="title"]',
                'h1',
            ];

            const companySelectors = [
                '[data-cb="company-name"]',
                '.data-display-header_info-content a',
                '.data-details-header_company-name',
                '.jdp-header-company',
                'span[class*="company"]',
                'a[href*="/company/"]',
            ];

            const locationSelectors = [
                '[data-cb="location"]',
                '.data-display-header_info-content .data-display-header_info-sub-text',
                '.data-details-header_location',
                '.jdp-header-location',
                'span[class*="location"]',
            ];

            const salarySelectors = [
                '[data-cb="salary"]',
                '.data-details-header_salary',
                '.jdp-header-salary',
                '.salary',
                'span[class*="salary"]',
            ];

            const descriptionSelectors = [
                '[data-cb="job-description"]',
                '.jdp-description-text',
                '#jdp-description-text',
                '.data-display-job_description',
                '.job-description',
                '.jdp-job-details-description',
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                location: findText(locationSelectors),
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: findText(['[data-cb="posted-date"]', '.job-date', '.posted-date']) || '',
            };
        },


        // =====================================================================
        // 9. BRIGHTERMONDAY — East Africa / Kenya's top job board
        // Notes: BrighterMonday uses a more traditional server-rendered
        // layout with well-structured semantic HTML. Important for local users.
        // =====================================================================
        'brightermonday.co.ke': () => {
            const isJobPage =
                window.location.pathname.includes('/job/') ||
                window.location.pathname.includes('/listings/') ||
                document.querySelector('.job-header') ||
                document.querySelector('.single-job');

            if (!isJobPage) {
                console.warn('[HuntMaster] BrighterMonday: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                'h1.job-header__title',
                '.job-header h1',
                'h1[class*="title"]',
                '.listing-title h1',
                'h1.job-title',
                '.single-job h1',
                // Schema.org structured data
                '[itemprop="title"]',
                'h1',
            ];

            const companySelectors = [
                '.job-header__company a',
                '.job-header__company',
                'a[class*="company"]',
                '[itemprop="hiringOrganization"] [itemprop="name"]',
                '.company-name a',
                '.company-name',
                '.listing-company a',
                '.single-job .company a',
            ];

            const locationSelectors = [
                '.job-header__location',
                '[itemprop="jobLocation"] [itemprop="addressLocality"]',
                '.job-header .location',
                '[class*="location"]',
                '.listing-location',
                'span.location',
            ];

            const salarySelectors = [
                '.job-header__salary',
                '[itemprop="baseSalary"]',
                '.salary-range',
                '.listing-salary',
                '[class*="salary"]',
            ];

            const descriptionSelectors = [
                '.job-description',
                '[itemprop="description"]',
                '.job-details__description',
                '.listing-description',
                '.single-job .description',
                '#job-description',
            ];

            // BrighterMonday sometimes uses schema.org structured data
            const schemaScript = document.querySelector('script[type="application/ld+json"]');
            let schemaData = null;
            if (schemaScript) {
                try {
                    schemaData = JSON.parse(schemaScript.textContent);
                    // Handle arrays (sometimes multiple schemas exist)
                    if (Array.isArray(schemaData)) {
                        schemaData = schemaData.find(s => s['@type'] === 'JobPosting') || null;
                    }
                } catch (e) { /* invalid JSON */ }
            }

            return {
                title: findText(titleSelectors) || schemaData?.title || '',
                company: findText(companySelectors) || schemaData?.hiringOrganization?.name || '',
                location: findText(locationSelectors) || schemaData?.jobLocation?.address?.addressLocality || '',
                salary: findText(salarySelectors) || (schemaData?.baseSalary?.value ? `${schemaData.baseSalary.currency || ''} ${schemaData.baseSalary.value}` : null),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors) || schemaData?.description || '',
                snippet: (extractCleanDescription(descriptionSelectors) || schemaData?.description || '').substring(0, 200),
                datePosted: schemaData?.datePosted || findText(['.job-header__date', '.posted-date', 'time[datetime]']) || '',
            };
        },


        // =====================================================================
        // 10. FUZU — Kenya / Africa focused career platform
        // Notes: Fuzu uses Rails-based server rendering with relatively
        // stable class names. Also supports schema.org markup.
        // =====================================================================
        'fuzu.com': () => {
            const isJobPage =
                window.location.pathname.includes('/job/') ||
                window.location.pathname.includes('/jobs/') ||
                document.querySelector('.job-detail') ||
                document.querySelector('.vacancy-page');

            if (!isJobPage) {
                console.warn('[HuntMaster] Fuzu: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '.job-detail__title',
                '.vacancy-page h1',
                '.job-header h1',
                'h1[class*="title"]',
                '.job-title',
                '[itemprop="title"]',
                'h1',
            ];

            const companySelectors = [
                '.job-detail__company',
                '.vacancy-page .company-name',
                '.job-header .company',
                'a[href*="/companies/"]',
                '[itemprop="hiringOrganization"] [itemprop="name"]',
                '.company-name',
                'a[class*="company"]',
            ];

            const locationSelectors = [
                '.job-detail__location',
                '.vacancy-page .location',
                '[itemprop="jobLocation"]',
                '.job-header .location',
                '[class*="location"]',
                'span.location',
            ];

            const salarySelectors = [
                '.job-detail__salary',
                '[itemprop="baseSalary"]',
                '.salary',
                '[class*="salary"]',
            ];

            const descriptionSelectors = [
                '.job-detail__description',
                '.vacancy-page .description',
                '[itemprop="description"]',
                '.job-description',
                '#job-description',
                '.job-content',
            ];

            // Try schema.org structured data (common on African job boards)
            const schemaScript = document.querySelector('script[type="application/ld+json"]');
            let schemaData = null;
            if (schemaScript) {
                try {
                    schemaData = JSON.parse(schemaScript.textContent);
                    if (Array.isArray(schemaData)) {
                        schemaData = schemaData.find(s => s['@type'] === 'JobPosting') || null;
                    }
                } catch (e) { /* invalid JSON */ }
            }

            return {
                title: findText(titleSelectors) || schemaData?.title || '',
                company: findText(companySelectors) || schemaData?.hiringOrganization?.name || '',
                location: findText(locationSelectors) || schemaData?.jobLocation?.address?.addressLocality || '',
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors) || schemaData?.description || '',
                snippet: (extractCleanDescription(descriptionSelectors) || schemaData?.description || '').substring(0, 200),
                datePosted: schemaData?.datePosted || findText(['.posted-date', 'time[datetime]', '.date']) || '',
            };
        },


        // =====================================================================
        // 11. WEWORKREMOTELY — Popular remote-only job board
        // Notes: WWR has a relatively simple, stable HTML structure.
        // Job detail pages use semantic elements with descriptive classes.
        // =====================================================================
        'weworkremotely.com': () => {
            const isJobPage =
                window.location.pathname.includes('/remote-jobs/') ||
                document.querySelector('.listing-header-container') ||
                document.querySelector('.listing-container');

            if (!isJobPage) {
                console.warn('[HuntMaster] WeWorkRemotely: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '.listing-header-container h1',
                'h1.listing-header__title',
                '.listing-container h1',
                'h1[class*="listing"]',
                '.job-listing h1',
                'h1',
            ];

            const companySelectors = [
                '.listing-header-container .company',
                '.company-card h2 a',
                '.company-card h2',
                '.listing-header__company-name',
                'h2.company',
                'a[href*="/company/"]',
                '.listing-container .company',
            ];

            const locationSelectors = [
                '.listing-header-container .region',
                '.listing-tag',
                '.location-restriction',
                '.region',
                // WWR is remote-first, so location may be "Anywhere" / region
                '.listing-header__location',
            ];

            const salarySelectors = [
                '.listing-header-container .salary',
                '.salary',
                '.compensation',
                '[class*="salary"]',
            ];

            const descriptionSelectors = [
                '.listing-container .listing-container__body',
                '.listing-container__body',
                '#job-listing-show-container',
                '.jobs-show .content',
                '.listing-container .content',
                'article',
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                location: findText(locationSelectors) || 'Remote',
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: findText(['.listing-header-container time', 'time[datetime]', '.posted-date']) || '',
            };
        },


        // =====================================================================
        // 12. REMOTE.CO — Curated remote job listings
        // Notes: Remote.co uses WordPress-based themes with relatively
        // clean, stable HTML. Job detail pages are individual posts.
        // =====================================================================
        'remote.co': () => {
            const isJobPage =
                window.location.pathname.includes('/job/') ||
                window.location.pathname.includes('/remote-jobs/') ||
                document.querySelector('.job_listing') ||
                document.querySelector('.job-detail');

            if (!isJobPage) {
                console.warn('[HuntMaster] Remote.co: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '.job_listing h1',
                '.job_listing-title',
                'h1.entry-title',
                '.job-detail h1',
                'h1.job-title',
                '.job_title h1',
                'article h1',
                'h1',
            ];

            const companySelectors = [
                '.job_listing .company .name',
                '.job_listing-company',
                '.company-name a',
                '.job-detail .company',
                '.company_name',
                'a[href*="/company/"]',
                'p.company',
            ];

            const locationSelectors = [
                '.job_listing .location',
                '.job_listing-location',
                '.job-detail .location',
                '.job-location',
                '[class*="location"]',
            ];

            const salarySelectors = [
                '.job_listing .salary',
                '.salary',
                '.job-detail .salary',
                '[class*="salary"]',
            ];

            const descriptionSelectors = [
                '.job_listing .job_description',
                '.job_description',
                '.job-detail .description',
                '.entry-content',
                '.job-detail-content',
                'article .content',
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                location: findText(locationSelectors) || 'Remote',
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: findText(['.job_listing .date', '.posted-date', 'time[datetime]', '.date']) || '',
            };
        },


        // =====================================================================
        // 13. FLEXJOBS — Remote & flexible job listings (partially paywalled)
        // Notes: FlexJobs uses a custom CMS. Some content may be behind a
        // paywall, but the user viewing the page has access if they're logged in.
        // =====================================================================
        'flexjobs.com': () => {
            const isJobPage =
                window.location.pathname.includes('/jobs/') ||
                window.location.pathname.includes('/job/') ||
                document.querySelector('#jobDetailMain') ||
                document.querySelector('.jobDetails');

            if (!isJobPage) {
                console.warn('[HuntMaster] FlexJobs: Not a job detail page');
                return null;
            }

            const titleSelectors = [
                '#jobDetailMain h1',
                'h1#jobTitle',
                '.jobDetails h1',
                'h1.job-title',
                '.job-detail-title h1',
                'h1[id*="job"]',
                'h1',
            ];

            const companySelectors = [
                '#jobDetailMain .company-name',
                '.jobDetails .company',
                '.job-company a',
                '.company-name',
                'a[href*="/company/"]',
                'h2.company',
                '[class*="companyName"]',
            ];

            const locationSelectors = [
                '#jobDetailMain .location',
                '.jobDetails .location',
                '.job-location',
                'span[class*="location"]',
                '[class*="Location"]',
            ];

            const salarySelectors = [
                '#jobDetailMain .salary',
                '.jobDetails .salary',
                '.job-salary',
                '[class*="salary"]',
                '[class*="Salary"]',
            ];

            const descriptionSelectors = [
                '#jobDescriptionSection',
                '#jobDetailMain .job-description',
                '.jobDetails .description',
                '.job-description-content',
                '.job-desc',
                'div[class*="Description"]',
            ];

            return {
                title: findText(titleSelectors),
                company: findText(companySelectors),
                location: findText(locationSelectors) || 'Remote / Flexible',
                salary: findText(salarySelectors),
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors),
                snippet: extractCleanDescription(descriptionSelectors)?.substring(0, 200) || '',
                datePosted: findText(['.posted-date', '.date', 'time[datetime]']) || '',
            };
        },


        // =====================================================================
        // GENERIC FALLBACK — Works on any page using structured data & heuristics
        // =====================================================================
        'generic': () => {
            // Attempt to extract from JSON-LD structured data first (most reliable)
            const schemaScripts = document.querySelectorAll('script[type="application/ld+json"]');
            let schemaData = null;
            for (const script of schemaScripts) {
                try {
                    const parsed = JSON.parse(script.textContent);
                    const data = Array.isArray(parsed)
                        ? parsed.find(s => s['@type'] === 'JobPosting')
                        : (parsed['@type'] === 'JobPosting' ? parsed : null);
                    if (data) {
                        schemaData = data;
                        break;
                    }
                } catch (e) { /* invalid JSON */ }
            }

            if (schemaData) {
                console.log('[HuntMaster] Found JobPosting schema.org data');
                const desc = typeof schemaData.description === 'string'
                    ? cleanText(schemaData.description.replace(/<[^>]*>/g, ''))   // Strip HTML tags
                    : '';
                return {
                    title: schemaData.title || '',
                    company: schemaData.hiringOrganization?.name || '',
                    location: schemaData.jobLocation?.address?.addressLocality ||
                              schemaData.jobLocation?.address?.addressRegion || '',
                    salary: schemaData.baseSalary?.value
                        ? `${schemaData.baseSalary.currency || ''} ${typeof schemaData.baseSalary.value === 'object' ? `${schemaData.baseSalary.value.minValue || ''} - ${schemaData.baseSalary.value.maxValue || ''}` : schemaData.baseSalary.value}`
                        : null,
                    url: window.location.href,
                    description: desc,
                    snippet: desc.substring(0, 200),
                    datePosted: schemaData.datePosted || '',
                };
            }

            // Fallback: meta tags + DOM heuristics
            const descriptionSelectors = [
                '[itemprop="description"]',
                'article',
                'main',
                '.job-description',
                '#job-description',
                '.description',
                '.job-content',
                '.posting-content',
            ];

            return {
                title: document.querySelector('h1')?.innerText?.trim() || document.title,
                company: getMeta('og:site_name') || '',
                location: '',
                salary: null,
                url: window.location.href,
                description: extractCleanDescription(descriptionSelectors) || getMeta('description') || '',
                snippet: (getMeta('description') || '').substring(0, 200),
                datePosted: getMeta('article:published_time') || '',
            };
        },
    };


    // =========================================================================
    // DOMAIN → SCRAPER ROUTING MAP
    // Maps hostname substrings to scraper keys for fast lookups.
    // Supports regional Indeed/Glassdoor variants (e.g. indeed.co.uk).
    // =========================================================================

    const DOMAIN_MAP = [
        // Order matters — more specific domains should come first
        { match: 'linkedin.com',          key: 'linkedin.com' },
        { match: 'foorilla.com',          key: 'foorilla.com' },
        { match: 'indeed.',               key: 'indeed.com' },      // Covers indeed.com, indeed.co.uk, etc.
        { match: 'glassdoor.',            key: 'glassdoor.com' },   // Covers all glassdoor TLDs
        { match: 'ziprecruiter.com',      key: 'ziprecruiter.com' },
        { match: 'monster.',              key: 'monster.com' },     // Covers monster.com, monster.co.uk, etc.
        { match: 'wellfound.com',         key: 'wellfound.com' },
        { match: 'careerbuilder.com',     key: 'careerbuilder.com' },
        { match: 'brightermonday.',       key: 'brightermonday.co.ke' }, // Covers .co.ke, .co.tz, .co.ug
        { match: 'fuzu.com',              key: 'fuzu.com' },
        { match: 'weworkremotely.com',    key: 'weworkremotely.com' },
        { match: 'remote.co',            key: 'remote.co' },
        { match: 'flexjobs.com',          key: 'flexjobs.com' },
    ];

    /**
     * Find the best scraper for the current hostname.
     */
    const findScraper = (hostname) => {
        for (const { match, key } of DOMAIN_MAP) {
            if (hostname.includes(match)) {
                return { name: key, scraper: SCRAPERS[key] };
            }
        }
        return null;
    };


    // =========================================================================
    // MESSAGE LISTENER
    // =========================================================================

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'SCRAPE_JOB') {
            try {
                const hostname = window.location.hostname;
                const matched = findScraper(hostname);
                let data = null;

                if (matched) {
                    data = safeScrape(matched.name, matched.scraper);
                }

                // Fallback if specific scraper didn't produce a title
                if (!data || !data.title) {
                    console.log('[HuntMaster] Using generic fallback scraper');
                    const genericResult = safeScrape('generic', SCRAPERS['generic']);
                    data = data
                        ? { ...genericResult, ...data, title: data.title || genericResult?.title }
                        : genericResult;
                }

                // Ensure we always return a valid object
                sendResponse(data || {
                    title: document.title,
                    company: '',
                    url: window.location.href,
                    description: '',
                });
            } catch (error) {
                console.error('[HuntMaster] Critical scraping error:', error);
                sendResponse({ error: error.message });
            }
        }
        return true; // Keep the message channel open for async sendResponse
    });

    // =========================================================================
    // LOG SUPPORTED SITE DETECTION
    // =========================================================================
    const matched = findScraper(window.location.hostname);
    if (matched) {
        console.log(`[HuntMaster] ✓ Detected supported job board: ${matched.name}`);
    }
}
