import { auth, db } from './firebase_config.js'; 
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    const userDoc = await getDoc(doc(db, "users", user.uid));
    const role = userDoc.exists() ? userDoc.data().role : "customer";

    // Role-based redirect if on login page
    if (window.location.pathname.endsWith("index.html")) {
      if (role === "admin") {
        window.location.href = "html_files/admin.html";
      } else {
        window.location.href = "html_files/dashboard.html";
      }
    }

    // Show welcome + logout button if login page has .container
    const loginContainer = document.querySelector('.container');
    if (loginContainer) {
      loginContainer.innerHTML = `
        <h2>Welcome back, ${user.email}</h2>
        <button id="logout-btn" class="btn btn-danger">Logout</button>
      `;
      document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut(auth);
        window.location.reload();
      });
    }

  } catch (err) {
    console.error("Error fetching user role:", err);
  }
});


document.addEventListener('DOMContentLoaded', () => {
  const loginBtn = document.getElementById('login-btn');
  const signupBtn = document.getElementById('signup-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // 🔑 LOGIN
  if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      const loginMsg = document.getElementById('login-msg');
      loginMsg.textContent = '';

      if (!email || !password) {
        loginMsg.textContent = 'Please enter both email and password.';
        return;
      }

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 🔎 get user role
        const userDoc = await getDoc(doc(db, "users", user.uid));
        let role = "customer";
        if (userDoc.exists()) {
          role = userDoc.data().role || "customer";
        }

        loginMsg.textContent = `Welcome, ${user.email}!`;

        // redirect based on role
        if (role === "admin") {
          window.location.href = "html_files/admin.html";
        } else {
          window.location.href = "html_files/dashboard.html";
        }
      } catch (error) {
        loginMsg.textContent = `Login failed: ${error.message}`;
      }
    });
  }

  // 📝 SIGNUP
  if (signupBtn) {
    signupBtn.addEventListener('click', async () => {
      const email = document.getElementById('signup-email').value.trim();
      const password = document.getElementById('signup-password').value.trim();
      const signupMsg = document.getElementById('signup-msg');
      signupMsg.textContent = '';

      if (!email || !password) {
        signupMsg.textContent = 'Please enter both email and password.';
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // store safe metadata
        await setDoc(doc(db, "users", user.uid), {
          email: email,
          role: "customer", // default role
          createdAt: new Date().toISOString()
        });

        signupMsg.textContent = `Account created for ${user.email}! Redirecting...`;
        setTimeout(() => {
          window.location.href = "../index.html";
        }, 1500);
      } catch (error) {
        signupMsg.textContent = `Signup failed: ${error.message}`;
      }
    });
  }

  // 🚪 LOGOUT
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = "../index.html";
      } catch (error) {
        console.error("Sign out error:", error);
      }
    });
  }
});
