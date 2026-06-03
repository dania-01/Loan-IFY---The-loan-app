import { auth, db } from './firebase_config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const LOAN_LIMIT = 500000;
const MIN_LOAN   = 50000;

document.addEventListener('DOMContentLoaded', () => {
  const loanApplicationForm = document.getElementById('loan-application-form');

  document.getElementById("themeToggle")?.addEventListener("click", () => {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
  });
  document.getElementById("hamburgerBtn")?.addEventListener("click", () => {
    document.getElementById("navLinks")?.classList.toggle("open");
  });

  const INTEREST_RATES = { personal: 12, home: 8.5, education: 9, auto: 10 };
  const loanTypeSelect = document.getElementById('loan-type');
  const interestRateInput = document.getElementById('interest-rate');

  function applyRate() {
    const rate = INTEREST_RATES[loanTypeSelect.value];
    if (rate) interestRateInput.value = rate;
  }
  loanTypeSelect.addEventListener('change', applyRate);
  applyRate();

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../index.html";
      return;
    }

    try {
      const snap = await getDocs(query(collection(db, 'loan-applications'), where('userId', '==', user.uid)));
      const totalUsed = snap.docs.reduce((sum, d) => sum + (d.data().loanAmount || 0), 0);

      if (totalUsed >= LOAN_LIMIT) {
        document.getElementById('limit-notice')?.classList.remove('hidden');
        loanApplicationForm.querySelectorAll('input, select, button[type="submit"]').forEach(el => el.disabled = true);

        Swal.fire({
          icon: 'error',
          title: 'Credit Limit Reached',
          html: `You have used your full credit limit of <strong>$${LOAN_LIMIT.toLocaleString()}</strong>.<br><br>Please contact admin to request a limit increase or manage your existing loans.`,
          confirmButtonText: 'Go to Dashboard',
          confirmButtonColor: '#0d6efd',
        }).then(() => {
          window.location.href = 'dashboard.html';
        });
        return;
      }
    } catch(err) { console.warn('Limit check failed', err); }

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

      // Re-check limit before submitting
      try {
        const snap = await getDocs(query(collection(db, 'loan-applications'), where('userId', '==', user.uid)));
        const totalUsed = snap.docs.reduce((sum, d) => sum + (d.data().loanAmount || 0), 0);
        if (totalUsed >= LOAN_LIMIT) {
          Swal.fire({ icon: 'error', title: 'Credit Limit Reached', text: 'You have reached your maximum credit limit. Please contact admin.' });
          submitBtn.disabled = false;
          submitBtn.textContent = "Submit Application";
          return;
        }
      } catch(err) { console.warn('Pre-submit limit check failed', err); }

      if (loanAmount < MIN_LOAN) {
        Swal.fire({ icon: 'warning', title: 'Amount Too Low', text: `Minimum loan amount is $${MIN_LOAN.toLocaleString()}.` });
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Application";
        return;
      }

      try {
        await addDoc(collection(db, "loan-applications"), {
          loanAmount, interestRate, loanDuration, loanType, loanPurpose,
          status: "Pending", userId: user.uid, createdAt: new Date()
        });
        Swal.fire({ icon: 'success', title: 'Application Submitted!', text: 'Your loan application is now pending review.', timer: 2500, showConfirmButton: false });
        loanApplicationForm.reset();
        applyRate();
      } catch (error) {
        console.error("Error submitting loan application:", error);
        Swal.fire({ icon: 'error', title: 'Submission Failed', text: 'Could not submit application. Please try again.' });
      }

      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Application";
    });
  });
});
