# HuntMaster – Your trusted job hunting companion

HuntMaster is a lightweight, privacy-first browser extension that helps job seekers capture, organize, and track job applications directly in the browser. Say goodbye to scattered notes, lost links, and forgotten follow-ups.

Manifest V3 compatible; works in Microsoft Edge, Chrome & compatible browsers, it offers one-click job scraping, a beautiful dashboard with real-time stats, status tracking, and secure local storage — all without accounts or external servers.

Microsoft Edge Add-ons Store Link: [HuntMaster](https://microsoftedge.microsoft.com/addons/detail/huntmaster/lnkkblgjhambifbiclmmimgjjffpllee)

## Key Features

- **Smart One-Click Job Capture**  
  Automatically extract job title, company, location, description, URL, and more from LinkedIn, Indeed, Glassdoor, and other major job boards.

- **Comprehensive Dashboard**  
  Clean overview of all applications with real-time statistics:  
  - Wishlist  
  - Applied  
  - Interviewing  
  - Offers  
  - Rejected  

- **Flexible Status & Management**  
  Update application status easily (Wishlist → Applied → Interviewing → Offer → Rejected).  
  Edit details, add notes, set application dates, and delete entries.

- **Convenient Side Panel**  
  Quick access for scanning pages, manual entry, and viewing recent jobs without opening a full popup.

- **Secure & Private**  
  All data is stored **locally** in the browser — nothing is sent to external servers.  
  Optional sync across your devices via browser sync.

- **Modern, Responsive UI**  
  Built with React, Vite, and Tailwind CSS — smooth hover effects, clean cards, dark/light mode support.

- **Direct Links & Full Descriptions**  
  Click any job to view the full saved description or jump back to the original posting.

## Installation

### Microsoft Edge

1. Visit the **Microsoft Edge Add-ons Store**.
2. Search for **HuntMaster**.
3. Click **Get** to install.

### Development mode
```bash
# Clone the repository
git clone https://github.com/Joseph-kdev/job-tracker-extension.git
cd job-tracker-extension

# Install dependencies
npm install

# Start dev server with hot module replacement
npm run dev

# Create production build (outputs to dist/)
npm run build
```
Load in Browser (Edge / Chrome):
- Run npm run build (or use the dist folder after dev build).
- Open Edge → edge://extensions/
- Enable Developer mode (top right)
- Click Load unpacked → select the dist folder
- The extension should now appear in your toolbar!

## Tech Stack
- Manifest V3
- React
- Tailwind CSS
- Browser Storage API

## Contributing

Issues and pull requests are welcome. If you identify extraction edge cases on specific job boards, feel free to submit improvements.

## Licence
MIT

