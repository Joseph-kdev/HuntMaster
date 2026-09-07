/* global chrome */

import {
	collection,
	doc,
	getDocs,
	onSnapshot,
	setDoc,
} from "firebase/firestore";
import { db } from "../libs/fireConfig";

const JOBS_KEY = "jobs";
const TOMBSTONES_KEY = "jobTombstones";

const getLocalState = async () => {
	const result = await chrome.storage.local.get([JOBS_KEY, TOMBSTONES_KEY]);
	return { jobs: result[JOBS_KEY] || [], tombstones: result[TOMBSTONES_KEY] || {} };
};

const setLocalState = (jobs, tombstones) =>
	chrome.storage.local.set({ [JOBS_KEY]: jobs, [TOMBSTONES_KEY]: tombstones });

const timestampFor = (value) => {
	const timestamp = Date.parse(value || "");
	return Number.isNaN(timestamp) ? 0 : timestamp;
};

export const getLocalJobs = async () => (await getLocalState()).jobs;

export const saveLocalJob = async (job) => {
	const { jobs, tombstones } = await getLocalState();
	const updatedJob = { ...job, updatedAt: job.updatedAt || new Date().toISOString() };
	const nextJobs = [updatedJob, ...jobs.filter((item) => item.id !== job.id)];
	const nextTombstones = { ...tombstones };
	delete nextTombstones[job.id];
	await setLocalState(nextJobs, nextTombstones);
	return updatedJob;
};

export const updateLocalJobs = async (jobs) => {
	const { tombstones } = await getLocalState();
	const updatedJobs = jobs.map((job) => ({
		...job,
		updatedAt: job.updatedAt || new Date().toISOString(),
	}));
	await setLocalState(updatedJobs, tombstones);
	return updatedJobs;
};

export const deleteLocalJob = async (jobId) => {
	const { jobs, tombstones } = await getLocalState();
	const deletedAt = new Date().toISOString();
	await setLocalState(
		jobs.filter((job) => job.id !== jobId),
		{ ...tombstones, [jobId]: deletedAt },
	);
	return deletedAt;
};

const jobsCollection = (uid) => collection(db, "users", uid, "jobs");

export const getCloudJobs = async (uid) => {
	const snapshot = await getDocs(jobsCollection(uid));
	return snapshot.docs.map((job) => job.data());
};

export const saveCloudJob = (uid, job) => setDoc(doc(jobsCollection(uid), job.id), job);

export const saveCloudTombstone = (uid, jobId, deletedAt) =>
	setDoc(doc(jobsCollection(uid), jobId), { id: jobId, deletedAt, updatedAt: deletedAt });

const mergeRecords = (localState, cloudJobs) => {
	const localRecords = new Map(
		localState.jobs.map((job) => [job.id, { type: "job", value: job }]),
	);
	Object.entries(localState.tombstones).forEach(([id, deletedAt]) => {
		localRecords.set(id, { type: "deleted", value: { id, deletedAt, updatedAt: deletedAt } });
	});
	const cloudRecords = new Map(
		cloudJobs.map((job) => [idOf(job), { type: job.deletedAt ? "deleted" : "job", value: job }]),
	);
	const merged = new Map();
	const cloudWrites = [];

	new Set([...localRecords.keys(), ...cloudRecords.keys()]).forEach((id) => {
		const local = localRecords.get(id);
		const cloud = cloudRecords.get(id);
		if (!local) {
			merged.set(id, cloud);
			return;
		}
		if (!cloud) {
			merged.set(id, local);
			cloudWrites.push(local);
			return;
		}
		const localTime = timestampFor(local.value.updatedAt || local.value.createdAt);
		const cloudTime = timestampFor(cloud.value.updatedAt || cloud.value.createdAt);
		const winner = localTime >= cloudTime ? local : cloud;
		merged.set(id, winner);
		if (winner === local) cloudWrites.push(local);
	});

	return { merged, cloudWrites };
};

const idOf = (record) => record.id;

const applyRecordsLocally = async (records) => {
	const jobs = [];
	const tombstones = {};
	records.forEach(({ type, value }) => {
		if (type === "deleted") tombstones[value.id] = value.deletedAt;
		else jobs.push(value);
	});
	await setLocalState(jobs, tombstones);
};

export const syncJobs = async (uid) => {
	const localState = await getLocalState();
	const cloudJobs = await getCloudJobs(uid);
	const { merged, cloudWrites } = mergeRecords(localState, cloudJobs);
	await Promise.all(cloudWrites.map(({ type, value }) =>
		type === "deleted"
			? saveCloudTombstone(uid, value.id, value.deletedAt)
			: saveCloudJob(uid, value),
	));
	await applyRecordsLocally(merged);
	return { jobs: [...merged.values()].filter((record) => record.type === "job").length, cloudWrites: cloudWrites.length };
};

export const subscribeToCloudJobs = (uid, callback, onError) =>
	onSnapshot(jobsCollection(uid), (snapshot) => callback(snapshot.docs.map((job) => job.data())), onError);
