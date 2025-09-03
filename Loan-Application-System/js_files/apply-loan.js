import { auth, db } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
  const loanApplicationForm = document.getElementById('loan-application-form');
  const calculateEmiBtn = document.getElementById('calculate-emi-btn');

  // 🌙 THEME TOGGLE
  const body = document.body;
  const themeIcon = document.getElementById("themeIcon");
  const toggleBtn = document.getElementById("themeToggle");

  // Load saved theme
  if (localStorage.getItem("theme") === "dark") {
    body.classList.add("dark-mode");
    if (themeIcon) themeIcon.textContent = "☀️ Light Mode";
  }

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      body.classList.toggle("dark-mode");
      const isDark = body.classList.contains("dark-mode");
      localStorage.setItem("theme", isDark ? "dark" : "light");
      if (themeIcon) themeIcon.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
    });
  }

  // 🔑 AUTH & LOAN FORM
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "../index.html";
      return;
    }

    loanApplicationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = loanApplicationForm.querySelector("button[type='submit']");
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      const loanAmount = parseFloat(document.getElementById('loan-amount').value);
      const interestRate = parseFloat(document.getElementById('interest-rate').value);
      const loanDuration = parseInt(document.getElementById('loan-duration').value);
      const loanType = document.getElementById('loan-type').value;
      const loanPurpose = document.getElementById('loan-purpose').value;

      if (loanAmount < 1000) {
        alert("Loan amount should be at least $1000.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Application";
        return;
      }

      try {
        await addDoc(collection(db, "loan-applications"), {
          loanAmount,
          interestRate,
          loanDuration,
          loanType,
          loanPurpose,
          status: "Pending",
          userId: user.uid,
          createdAt: new Date()
        });
        alert("✅ Loan application submitted successfully!");
        loanApplicationForm.reset();
      } catch (error) {
        console.error("Error submitting loan application:", error);
        alert("❌ Failed to submit loan application. Check permissions in Firestore rules.");
      }

      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Application";
    });

    // 📊 EMI Calculator
    calculateEmiBtn.addEventListener('click', () => {
      const emiLoanAmount = parseFloat(document.getElementById('emi-loan-amount').value);
      const emiInterestRate = parseFloat(document.getElementById('emi-interest-rate').value);
      const emiLoanDuration = parseInt(document.getElementById('emi-loan-duration').value);

      if (emiLoanAmount <= 0 || emiInterestRate <= 0 || emiLoanDuration <= 0) {
        alert("Please enter valid values for loan amount, interest rate, and duration.");
        return;
      }

      const monthlyInterestRate = emiInterestRate / 100 / 12;
      const emi = emiLoanAmount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, emiLoanDuration) /
        (Math.pow(1 + monthlyInterestRate, emiLoanDuration) - 1);

      document.getElementById('emi-amount').textContent = `$${emi.toFixed(2)}`;
    });
  });
});
