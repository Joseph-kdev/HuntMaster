import { useState } from "react";
import { extractSkills } from "../libs/skillExtractor";

const SkillBadge = ({ label, color }) => (
  <span
    className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium ${color}`}
  >
    {label}
  </span>
);

const LEVEL_COLORS = {
  Junior: "bg-green-100 text-green-800",
  "Mid-level": "bg-blue-100 text-blue-800",
  Senior: "bg-purple-100 text-purple-800",
  Lead: "bg-orange-100 text-orange-800",
  "Not specified": "bg-gray-100 text-gray-600",
};

export default function SidePanel() {
  const [jobDetails, setJobDetails] = useState({
    title: "",
    company: "",
    url: "",
    status: "Applied",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [skills, setSkills] = useState(null);

  const scanPage = async () => {
    setLoading(true);
    setMessage("");
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab?.id) {
        throw new Error("No active tab found");
      }

      const sendMessage = async () => {
        return chrome.tabs.sendMessage(tab.id, { action: "SCRAPE_JOB" });
      };

      let response;
      try {
        response = await sendMessage();
      } catch (e) {
        // If message fails, script might not be loaded. Try injecting it.
        console.log("Script not ready, injecting...", e);

        const manifest = chrome.runtime.getManifest();
        const contentScript = manifest.content_scripts[0].js[0];

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [contentScript],
        });
        // Wait a bit for script to initialize
        await new Promise((r) => setTimeout(r, 500));
        response = await sendMessage();
      }

      if (response && !response.error) {
        setJobDetails((prev) => ({
          ...prev,
          title: response.title || prev.title,
          url: response.url || prev.url,
          // Simple heuristic to guess company from title if " - " exists
          company: response.company || response.title.split(" - ")[1] || "",
          description: response.description || "",
        }));
        setMessage("Page scanned successfully!");
      } else {
        const errorMsg = response?.error || "Could not scrape page.";
        setMessage(`${errorMsg} Try refreshing the tab.`);
      }
    } catch (error) {
      console.error("Scan error:", error);
      setMessage(
        "Error scanning page. Please refresh the job page and try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const analyzeDescription = async () => {
    if (!jobDetails.description) {
      setMessage("Scan a page first to get a job description.");
      return;
    }

    setAnalyzing(true);
    setSkills(null);
    setMessage("");

    try {
      const result = await extractSkills(jobDetails.description);
      setSkills(result);
    } catch (error) {
      setMessage("Failed AI analysis. Try again later");
    } finally {
      setAnalyzing(false);
    }
  };

  const saveJob = async (e) => {
    e.preventDefault();
    try {
      const result = await chrome.storage.local.get(["jobs"]);
      const jobs = result.jobs || [];
      const newJob = {
        ...jobDetails,
        extractSkills: skills ?? null,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      };

      await chrome.storage.local.set({ jobs: [newJob, ...jobs] });
      setMessage("Job saved successfully!");
      setJobDetails({
        title: "",
        company: "",
        url: "",
        status: "Applied",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      setSkills(null);
    } catch (error) {
      console.error("Save error:", error);
      setMessage("Failed to save job.");
    }
  };

  return (
    <div className="p-2 w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <h1 className="text-xl font-bold mb-2 text-center bg-[url('/jigsaw.svg')] bg-contain">
        HuntMaster
      </h1>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <button
          onClick={scanPage}
          disabled={loading}
          className="w-full mb-4 px-4 py-2 bg-gray-400 font-semibold text-gray-900 rounded hover:bg-gray-500 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-[0_6px_0_#494949] active:shadow-none active:translate-y-1.5"
        >
          {loading ? "Scanning..." : "Scan Current Page"}
        </button>

        <button
          onClick={analyzeDescription}
          disabled={analyzing || !jobDetails.description}
          className="w-full mb-4 px-4 py-2 bg-indigo-500 font-semibold text-white rounded hover:bg-indigo-600 disabled:opacity-40 transition-colors shadow-[0_6px_0_#3730a3] active:shadow-none active:translate-y-1.5"
        >
          {analyzing ? "Analyzing..." : "✦ Extract Skills with AI"}
        </button>

        {message && (
          <div
            className={`mb-4 p-2 text-sm rounded ${message.includes("Error") || message.includes("Failed") ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
          >
            {message}
          </div>
        )}

        {skills && (
          <div className="mb-4 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-indigo-700 dark:text-indigo-300">
                AI Skill Breakdown
              </span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full font-medium ${LEVEL_COLORS[skills.experienceLevel]}`}
              >
                {skills.experienceLevel}
              </span>
            </div>

            <p className="text-gray-600 dark:text-gray-400 italic">
              {skills.summary}
            </p>

            {skills.technicalSkills.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Technical
                </p>
                <div className="flex flex-wrap gap-1">
                  {skills.technicalSkills.map((s) => (
                    <SkillBadge
                      key={s}
                      label={s}
                      color="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                    />
                  ))}
                </div>
              </div>
            )}

            {skills.softSkills.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Soft Skills
                </p>
                <div className="flex flex-wrap gap-1">
                  {skills.softSkills.map((s) => (
                    <SkillBadge
                      key={s}
                      label={s}
                      color="bg-emerald-100 text-emerald-800"
                    />
                  ))}
                </div>
              </div>
            )}

            {skills.niceToHave.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
                  Nice to Have
                </p>
                <div className="flex flex-wrap gap-1">
                  {skills.niceToHave.map((s) => (
                    <SkillBadge
                      key={s}
                      label={s}
                      color="bg-gray-100 text-gray-600"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={saveJob} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Job Title</label>
            <input
              type="text"
              required
              value={jobDetails.title}
              onChange={(e) =>
                setJobDetails({ ...jobDetails, title: e.target.value })
              }
              className="w-full p-2 text-sm border rounded bg-transparent dark:border-gray-600 shadow-[inset_0_4px_8px_-2px_rgba(0,0,0,0.5)]"
              placeholder="e.g. Senior Frontend Dev"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Company</label>
            <input
              type="text"
              value={jobDetails.company}
              onChange={(e) =>
                setJobDetails({ ...jobDetails, company: e.target.value })
              }
              className="w-full p-2 text-sm border rounded bg-transparent dark:border-gray-600 shadow-[inset_0_4px_8px_-2px_rgba(0,0,0,0.5)]"
              placeholder="e.g. Acme Corp"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Job URL</label>
            <input
              type="url"
              required
              value={jobDetails.url}
              onChange={(e) =>
                setJobDetails({ ...jobDetails, url: e.target.value })
              }
              className="w-full p-2 text-sm border rounded bg-transparent dark:border-gray-600 shadow-[inset_0_4px_8px_-2px_rgba(0,0,0,0.5)]"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Job Description
            </label>
            <textarea
              value={jobDetails.description}
              onChange={(e) =>
                setJobDetails({ ...jobDetails, description: e.target.value })
              }
              className="w-full p-2 text-sm border rounded bg-transparent dark:border-gray-600 min-h-25 shadow-[inset_0_4px_8px_-2px_rgba(0,0,0,0.5)]"
              placeholder="Job requirements and details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={jobDetails.status}
                onChange={(e) =>
                  setJobDetails({ ...jobDetails, status: e.target.value })
                }
                className="w-full p-2 text-sm border rounded bg-[rgba(0,0,0,0.3)] dark:border-gray-600 shadow-[inset_0_4px_8px_-2px_rgba(0,0,0,0.5)]"
              >
                <option>Wishlist</option>
                <option>Applied</option>
                <option>Interviewing</option>
                <option>Offer</option>
                <option>Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input
                type="date"
                value={jobDetails.date}
                onChange={(e) =>
                  setJobDetails({ ...jobDetails, date: e.target.value })
                }
                className="w-full p-2 text-sm border rounded bg-transparent dark:border-gray-600 shadow-[inset_0_4px_8px_-2px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 px-4 py-2 bg-green-600 text-white text-lg rounded hover:bg-green-700 transition-colors shadow-[0_6px_0_#005816] active:shadow-none active:translate-y-1.5"
          >
            Save
          </button>
        </form>

        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="w-full px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2  shadow-[0_6px_0_#2e2e2ed4] active:shadow-none active:translate-y-1.5 bg-gray-600 rounded-sm"
          >
            Open Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
