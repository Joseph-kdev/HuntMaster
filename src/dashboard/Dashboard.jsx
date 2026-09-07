/* global chrome */

import { Eye, LogOut, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import AuthPage from "./AuthPage";
import { logOut, subscribeToAuth } from "../services/auth";
import {
  deleteLocalJob,
  saveCloudJob,
  saveCloudTombstone,
  subscribeToCloudJobs,
  syncJobs,
  updateLocalJobs,
} from "../services/storage";

const applicationDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const formatApplicationDate = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
        ? new Date(`${value}T00:00:00`)
        : new Date(value);

  return Number.isNaN(date.getTime())
    ? String(value)
    : applicationDateFormatter.format(date);
};

export default function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  const [selectedJob, setSelectedJob] = useState(null);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [syncState, setSyncState] = useState({ status: "idle", error: "" });

  useEffect(
    () =>
      subscribeToAuth((nextUser) => {
        setUser(nextUser);
        setSyncState(
          nextUser
            ? { status: "syncing", error: "" }
            : { status: "idle", error: "" },
        );
      }),
    [],
  );

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let active = true;
    syncJobs(user.uid)
      .then(() => {
        if (active) setSyncState({ status: "success", error: "" });
      })
      .catch((error) => {
        console.error("Initial sync error:", error);
        if (active) setSyncState({ status: "error", error: error.message });
      });

    const unsubscribe = subscribeToCloudJobs(
      user.uid,
      () =>
        syncJobs(user.uid).catch((error) =>
          console.error("Cloud update error:", error),
        ),
      (error) => {
        console.error("Cloud listener error:", error);
        if (active) setSyncState({ status: "error", error: error.message });
      },
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [user]);

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

  const handleStatusChange = async (jobId, newStatus) => {
    const updatedJobs = jobs.map((job) =>
      job.id === jobId
        ? { ...job, status: newStatus, updatedAt: new Date().toISOString() }
        : job,
    );
    setJobs(updatedJobs);
    await updateLocalJobs(updatedJobs);
    if (user) {
      const updatedJob = updatedJobs.find((job) => job.id === jobId);
      try {
        await saveCloudJob(user.uid, updatedJob);
      } catch (error) {
        console.error("Status sync error:", error);
        setSyncState({
          status: "error",
          error: "Status saved locally but not synced.",
        });
      }
    }
  };

  const confirmDelete = async () => {
    if (!jobToDelete) return;
    const newJobs = jobs.filter((j) => j.id !== jobToDelete.id);
    setJobs(newJobs);
    const deletedAt = await deleteLocalJob(jobToDelete.id);
    setJobToDelete(null);
    if (selectedJob?.id === jobToDelete.id) {
      setSelectedJob(null);
    }
    if (user) {
      try {
        await saveCloudTombstone(user.uid, jobToDelete.id, deletedAt);
      } catch (error) {
        console.error("Delete sync error:", error);
        setSyncState({
          status: "error",
          error: "Deleted locally but not synced.",
        });
      }
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

  if (showAuth) {
    return (
      <AuthPage
        onBack={() => setShowAuth(false)}
        onSuccess={() => setShowAuth(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-4 flex flex-col justify-between gap-4 pb-4 sm:flex-row sm:items-start">
          <div className="flex gap-4">
            <img src="/icon.png" alt="" width={50} className="rounded-md"/>
            <div>
              <h1 className="text-2xl font-bold text-grey-200">HuntMaster</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Track and manage your job applications.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-stretch sm:items-end">
            {user ? (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <span className="flex items-center gap-2" title={user.email}>
                  <UserRound className="h-4 w-4 text-blue-400" />
                  <span className="max-w-48 truncate">{user.email}</span>
                </span>
                <button
                  type="button"
                  onClick={logOut}
                  className="flex items-center gap-2 rounded-sm bg-gray-600 px-3 py-2 font-semibold text-gray-200 shadow-[0_5px_0_#2e2e2ed4] transition hover:bg-gray-500 active:translate-y-1 active:shadow-none"
                >
                  <LogOut className="h-4 w-4" /> Log out
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_0_#1e3a8a] transition hover:bg-blue-600 active:translate-y-1.5 active:shadow-none"
                >
                  Enable Cloud Sync
                </button>
                <p className="mt-2 text-right text-xs text-gray-400">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setShowAuth(true)}
                    className="text-blue-400 underline-offset-2 hover:text-blue-300 hover:underline"
                  >
                    Log in
                  </button>
                </p>
              </>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
          <div className="p-6 bg-gray-600 rounded-lg shadow hover:bg-[url('/hideout.svg')] border border-gray-200 ring-gray-50 hover:-translate-y-1">
            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
              Wishlist
            </h2>
            <p className="text-3xl font-bold">{stats.wishlist}</p>
          </div>
          <div className="p-6 bg-blue-400/40 rounded-lg shadow border border-blue-600 hover:-translate-y-1">
            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
              Applied
            </h2>
            <p className="text-3xl font-bold">{stats.applied}</p>
          </div>
          <div className="p-6 bg-orange-400/40 rounded-lg shadow border border-orange-300 ring-orange-400 hover:-translate-y-1">
            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
              Interviewing
            </h2>
            <p className="text-3xl font-bold">{stats.interviewing}</p>
          </div>
          <div className="p-6 bg-green-500/40 rounded-lg shadow border border-green-400 ring-green-400 hover:-translate-y-1">
            <h2 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-1">
              Offers
            </h2>
            <p className="text-3xl font-bold">{stats.offers}</p>
          </div>
        </div>

        <div className="rounded-xl shadow overflow-hidden">
          <div className="py-4 text-gray-300">
            <h2 className="text-xl font-bold">Recent Applications</h2>
          </div>
          <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-t-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700 text-sm uppercase text-gray-500 dark:text-gray-400">
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
                        {formatApplicationDate(job.date)}
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
                        {job.extractSkills
                          ? `${
                              (job.extractSkills.technicalSkills?.length || 0) +
                              (job.extractSkills.softSkills?.length || 0) +
                              (job.extractSkills.niceToHave?.length || 0)
                            } skills`
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

      {syncState.status !== "idle" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-3">
              {syncState.status === "syncing"
                ? "Syncing your applications"
                : syncState.status === "success"
                  ? "Applications synced"
                  : "Cloud sync needs attention"}
            </h3>
            <p className="mb-5 text-gray-600 dark:text-gray-400">
              {syncState.status === "syncing"
                ? "Merging your local applications with your cloud data..."
                : syncState.status === "success"
                  ? "Your local and cloud applications are now up to date."
                  : syncState.error ||
                    "Your local changes are saved and will be retried."}
            </p>
            {syncState.status === "error" && (
              <button
                type="button"
                onClick={() => {
                  setSyncState({ status: "syncing", error: "" });
                  syncJobs(user.uid)
                    .then(() => setSyncState({ status: "success", error: "" }))
                    .catch((error) =>
                      setSyncState({ status: "error", error: error.message }),
                    );
                }}
                className="mr-3 px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Retry
              </button>
            )}
            {syncState.status !== "syncing" && (
              <button
                type="button"
                onClick={() => setSyncState({ status: "idle", error: "" })}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      )}

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
                  {selectedJob.company} • {formatApplicationDate(selectedJob.date)}
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

              {selectedJob.extractSkills ? (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-200">
                    AI Extracted Skills
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">
                    {selectedJob.extractSkills.summary}
                  </p>
                  <div className="mt-2 text-xs text-gray-700 dark:text-gray-200">
                    <div>
                      <strong>Experience Level:</strong>{" "}
                      {selectedJob.extractSkills.experienceLevel || "Unknown"}
                    </div>
                    <div>
                      <strong>Technical:</strong>{" "}
                      {selectedJob.extractSkills.technicalSkills?.join(", ") ||
                        "—"}
                    </div>
                    <div>
                      <strong>Soft:</strong>{" "}
                      {selectedJob.extractSkills.softSkills?.join(", ") || "—"}
                    </div>
                    <div>
                      <strong>Nice to Have:</strong>{" "}
                      {selectedJob.extractSkills.niceToHave?.join(", ") || "—"}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    No AI skills extracted for this job. Stored description is
                    shown above.
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
