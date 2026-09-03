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
  Optional Firebase authentication is available from the dashboard. Job cloud sync is not enabled yet.

- **Modern, Responsive UI**  
  Built with React, Vite, and Tailwind CSS — smooth hover effects, clean cards, dark/light mode support.

- **Direct Links & Full Descriptions**  
  Click any job to view the full saved description or jump back to the original posting.

## Installation

### Firebase authentication setup

The dashboard authentication flow uses the Firebase project configured in `src/libs/fireConfig.js`.

1. Set `VITE_FIREBASE_KEY` in `.env`.
2. In Firebase Console, enable the **Email/Password** and **Google** sign-in providers under Authentication.
3. Add the local development host and any extension host used for testing to Firebase Authentication's authorized domains when required.

Authentication is optional. Signing in does not upload or synchronize job applications in this version; applications continue to use local extension storage.

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

# Start the dashboard preview with hot module replacement
npm run dev

# Or preview a specific extension surface
npm run dev:sidepanel

# Preview URLs
# Dashboard: http://127.0.0.1:5173/src/dashboard/index.html
# Side panel: http://127.0.0.1:5173/src/sidepanel/index.html

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

