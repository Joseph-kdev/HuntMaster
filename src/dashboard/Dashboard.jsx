import { Eye, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);

  const [selectedJob, setSelectedJob] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);

  useEffect(() => {
    // Fetch initial jobs
    chrome.storage.local.get(["jobs"], (result) => {
      if (result.jobs) {
        setJobs(result.jobs);
      }
    });

    // Listen for storage changes to update realtime
    const handleStorageChange = (changes, area) => {
      if (area === "local" && changes.jobs) {
        setJobs(changes.jobs.newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const handleStatusChange = (jobId, newStatus) => {
    const updatedJobs = jobs.map((job) =>
      job.id === jobId ? { ...job, status: newStatus } : job,
    );
    setJobs(updatedJobs);
    chrome.storage.local.set({ jobs: updatedJobs });
  };

  const confirmDelete = () => {
    if (!jobToDelete) return;
    const newJobs = jobs.filter((j) => j.id !== jobToDelete.id);
    setJobs(newJobs);
    chrome.storage.local.set({ jobs: newJobs });
    setJobToDelete(null);
    if (selectedJob?.id === jobToDelete.id) {
      setSelectedJob(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Applied":
        return "bg-blue-100 text-blue-800";
      case "Interviewing":
        return "bg-yellow-100 text-yellow-800";
      case "Offer":
        return "bg-green-100 text-green-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      case "Wishlist":
        return "bg-purple-100 text-purple-800"; // Added Wishlist color
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = {
    applied: jobs.filter((j) => j.status === "Applied").length,
    interviewing: jobs.filter((j) => j.status === "Interviewing").length,
    offers: jobs.filter((j) => j.status === "Offer").length,
    wishlist: jobs.filter((j) => j.status == "Wishlist").length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4 border-b pb-4 dark:border-gray-700">
          <h1 className="text-3xl font-bold text-blue-600">
            HuntMaster Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track and manage your job applications.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-white hover:bg-[url('/hideout.svg')]">
            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
              Wishlist
            </h2>
            <p className="text-3xl font-bold">{stats.wishlist}</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-blue-500">
            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
              Applied
            </h2>
            <p className="text-3xl font-bold">{stats.applied}</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-yellow-500">
            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
              Interviewing
            </h2>
            <p className="text-3xl font-bold">{stats.interviewing}</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow border-l-4 border-green-500">
            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
              Offers
            </h2>
            <p className="text-3xl font-bold">{stats.offers}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700">
            <h2 className="text-xl font-bold">Recent Applications</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 text-sm uppercase text-gray-500 dark:text-gray-300">
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold">Company</th>
                  <th className="p-4 font-semibold">Role</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Skills identified</th>
                  <th className="p-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {jobs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      No applications saved yet. Use the extension side panel to
                      add one!
                    </td>
                  </tr>
                ) : (
                  jobs.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-gray-900 dark:hover:bg-gray-750"
                    >
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                        {job.date}
                      </td>
                      <td className="p-4 font-medium">{job.company}</td>
                      <td className="p-4">
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {job.title}
                        </a>
                      </td>
                      <td className="p-4">
                        <select
                          value={job.status}
                          onChange={(e) =>
                            handleStatusChange(job.id, e.target.value)
                          }
                          className={`px-2 py-1 text-xs font-semibold rounded-sm border-none cursor-pointer focus:ring-2 focus:ring-offset-1 outline-none
                            ${getStatusColor(job.status)}`}
                        >
                          <option value="Wishlist">Wishlist</option>
                          <option value="Applied">Applied</option>
                          <option value="Interviewing">Interviewing</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                      <td className="p-4 text-xs text-gray-600 dark:text-gray-300">
                        {job.aiSkills
                          ? `${(job.aiSkills.technicalSkills?.length || 0) +
                              (job.aiSkills.softSkills?.length || 0) +
                              (job.aiSkills.niceToHave?.length || 0)} skills`
                          : "None"}
                      </td>
                      <td className="p-4 flex gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium border rounded-lg border-gray-700 px-2 py-1 shadow-[0_6px_0_#3f3f3f] active:shadow-none active:translate-y-1.5"
                          onClick={() => setSelectedJob(job)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded-lg border border-red-800 shadow-[0_6px_0_#360000] active:shadow-none active:translate-y-1.5"
                          onClick={() => setJobToDelete(job)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {jobToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transform transition-all scale-100">
            <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
              Delete Application?
            </h3>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Are you sure you want to delete the application for{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {jobToDelete.title}
              </span>{" "}
              at{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {jobToDelete.company}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setJobToDelete(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors shadow-[0_6px_0_#2f2f2f] active:shadow-none active:translate-y-1.5"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-[0_6px_0_#210000] active:shadow-none active:translate-y-1.5"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedJob && (
        <div className="fixed inset-0 backdrop-blur bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">{selectedJob.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedJob.company} • {selectedJob.date}
                </p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                {selectedJob.description ||
                  "No description available for this job."}
              </div>

              {selectedJob.aiSkills ? (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-200">
                    AI Extracted Skills
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {selectedJob.aiSkills.summary}
                  </p>
                  <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                    <div>
                      <strong>Experience Level:</strong>{" "}
                      {selectedJob.aiSkills.experienceLevel || "Unknown"}
                    </div>
                    <div>
                      <strong>Technical:</strong>{" "}
                      {selectedJob.aiSkills.technicalSkills?.join(", ") || "—"}
                    </div>
                    <div>
                      <strong>Soft:</strong>{" "}
                      {selectedJob.aiSkills.softSkills?.join(", ") || "—"}
                    </div>
                    <div>
                      <strong>Nice to Have:</strong>{" "}
                      {selectedJob.aiSkills.niceToHave?.join(", ") || "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    No AI skills extracted for this job. Stored description is shown above.
                  </p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t dark:border-gray-700">
                <a
                  href={selectedJob.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Visit Original Job Post
                </a>
              </div>
            </div>

            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-lg flex justify-end">
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-[0_6px_0_#2e2e2ed4] active:shadow-none active:translate-y-1.5 bg-gray-600 rounded-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
