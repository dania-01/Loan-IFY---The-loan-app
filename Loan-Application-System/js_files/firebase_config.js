import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4eEU5GPpxg0Bp5NFK8GNBUsBVZqxEmJY",
  authDomain: "loan-application-system-0011.firebaseapp.com",
  projectId: "loan-application-system-0011",
  storageBucket: "loan-application-system-0011.firebasestorage.app",
  messagingSenderId: "591480313230",
  appId: "1:591480313230:web:ce4606631feb9c334700df",
  measurementId: "G-JH9Z4XXD6E"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// ✅ Make auth persistent (user stays signed in after refresh)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence enabled ✅");
  })
  .catch((error) => {
    console.error("Auth persistence error:", error);
  });
