import { initializeApp } from "firebase/app";
import {
	GoogleAuthProvider,
	createUserWithEmailAndPassword,
	getAuth,
	sendPasswordResetEmail,
	signInWithEmailAndPassword,
	signInWithPopup,
	signOut,
} from "firebase/auth";

const firebaseConfig = {
	apiKey: import.meta.env.VITE_FIREBASE_KEY,
	authDomain: "huntmaster-31b78.firebaseapp.com",
	projectId: "huntmaster-31b78",
	storageBucket: "huntmaster-31b78.firebasestorage.app",
	messagingSenderId: "116708210021",
	appId: "1:116708210021:web:e6253982fcd71e86811d8c",
	measurementId: "G-GGVMW2LBVP",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
	if (request.target !== "offscreen-auth") return false;

	if (request.type === "GOOGLE_SIGN_IN") {
		signInWithPopup(auth, googleProvider)
			.then((result) => {
				sendResponse({
					success: true,
					user: {
						uid: result.user.uid,
						email: result.user.email,
						displayName: result.user.displayName,
					},
				});
			})
			.catch((error) => {
				sendResponse({
					success: false,
					error: error.message,
					code: error.code,
				});
			});
		return true; // Keep message channel open for async response
	}

	if (request.type === "EMAIL_SIGN_IN") {
		signInWithEmailAndPassword(auth, request.email, request.password)
			.then((result) => {
				sendResponse({
					success: true,
					user: {
						uid: result.user.uid,
						email: result.user.email,
					},
				});
			})
			.catch((error) => {
				sendResponse({
					success: false,
					error: error.message,
					code: error.code,
				});
			});
		return true;
	}

	if (request.type === "EMAIL_SIGN_UP") {
		createUserWithEmailAndPassword(auth, request.email, request.password)
			.then((result) => {
				sendResponse({
					success: true,
					user: {
						uid: result.user.uid,
						email: result.user.email,
					},
				});
			})
			.catch((error) => {
				sendResponse({
					success: false,
					error: error.message,
					code: error.code,
				});
			});
		return true;
	}

	if (request.type === "RESET_PASSWORD") {
		sendPasswordResetEmail(auth, request.email)
			.then(() => {
				sendResponse({ success: true });
			})
			.catch((error) => {
				sendResponse({
					success: false,
					error: error.message,
					code: error.code,
				});
			});
		return true;
	}

	if (request.type === "LOG_OUT") {
		signOut(auth)
			.then(() => {
				sendResponse({ success: true });
			})
			.catch((error) => {
				sendResponse({
					success: false,
					error: error.message,
					code: error.code,
				});
			});
		return true;
	}
});
