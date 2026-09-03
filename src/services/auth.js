/* global chrome */

import {
	GoogleAuthProvider,
	createUserWithEmailAndPassword,
	onAuthStateChanged,
	sendPasswordResetEmail,
	signInWithCredential,
	signInWithEmailAndPassword,
	signOut,
} from "firebase/auth/web-extension";
import { auth } from "../libs/fireConfig";

export const signIn = (email, password) =>
	signInWithEmailAndPassword(auth, email, password);

export const signUp = (email, password) =>
	createUserWithEmailAndPassword(auth, email, password);

const signInWithGoogleToken = (token) => {
	const credential = GoogleAuthProvider.credential(null, token);
	return signInWithCredential(auth, credential);
};

const getAuthTokenWithWebFlow = () =>
	new Promise((resolve, reject) => {
		const clientId =
			import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID ||
			import.meta.env.VITE_GOOGLE_CLIENT_ID;
		const redirectUri = chrome.identity.getRedirectURL();
		if (!clientId || !redirectUri) {
			reject(new Error("Google sign-in is not configured for this extension."));
			return;
		}

		const params = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: "token",
			scope: "openid email profile",
			prompt: "select_account",
		});

		chrome.identity.launchWebAuthFlow(
			{
				url: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
				interactive: true,
			},
			(responseUrl) => {
				const lastError = chrome.runtime.lastError;
				if (lastError || !responseUrl) {
					reject(
						new Error(lastError?.message || "Google sign-in was cancelled."),
					);
					return;
				}

				const url = new URL(responseUrl);
				const hashParams = new URLSearchParams(
					url.hash.startsWith("#") ? url.hash.slice(1) : url.hash,
				);
				const searchParams = url.searchParams;
				const token = hashParams.get("access_token");
				const error = searchParams.get("error") || hashParams.get("error");

				if (error || !token) {
					reject(
						new Error(error || "Google sign-in did not return an access token."),
					);
					return;
				}
				resolve(token);
			},
		);
	});

const getAuthToken = () =>
	new Promise((resolve, reject) => {
		chrome.identity.getAuthToken({ interactive: true }, (token) => {
			const lastError = chrome.runtime.lastError;
			if (lastError || !token) {
				reject(new Error(lastError?.message || "Google sign-in was cancelled."));
				return;
			}
			resolve(token);
		});
	});

export const signInWithGoogle = async () => {
	if (typeof chrome === "undefined" || !chrome?.identity) {
		throw new Error("chrome.identity API is not available in this environment.");
	}

	const isEdge =
		typeof navigator !== "undefined" && /Edg\//i.test(navigator.userAgent);

	// On non-Edge Chromium browsers (e.g., Chrome), try native getAuthToken first
	if (!isEdge && chrome.identity.getAuthToken) {
		try {
			return await signInWithGoogleToken(await getAuthToken());
		} catch (error) {
			if (!chrome.identity.launchWebAuthFlow) {
				throw error;
			}
		}
	}

	// On Edge or as fallback when getAuthToken fails, use launchWebAuthFlow
	if (chrome.identity.launchWebAuthFlow) {
		return signInWithGoogleToken(await getAuthTokenWithWebFlow());
	}

	throw new Error("No supported Google sign-in method is available.");
};

export const resetPassword = (email) => sendPasswordResetEmail(auth, email);

export const logOut = () => signOut(auth);

export const subscribeToAuth = (callback) => onAuthStateChanged(auth, callback);

export const getAuthErrorMessage = (error) => {
	switch (error?.code) {
		case "auth/invalid-credential":
		case "auth/user-not-found":
		case "auth/wrong-password":
			return "The email or password is incorrect.";
		case "auth/email-already-in-use":
			return "An account already exists with this email.";
		case "auth/weak-password":
			return "Choose a password with at least six characters.";
		case "auth/invalid-email":
			return "Enter a valid email address.";
		default:
			return error?.message || "Authentication failed. Please try again.";
	}
};
