import { auth, db } from './firebase_config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function calculateEndDate(startDate, durationInMonthsStr) {
  const durationInMonths = parseInt(durationInMonthsStr, 10);
  if (!startDate || isNaN(durationInMonths)) {
    console.warn("Invalid input for calculateEndDate:", startDate, durationInMonthsStr);
    return null;
  }
  const dateObj = startDate instanceof Date ? startDate : (startDate.toDate ? startDate.toDate() : new Date(startDate));
  dateObj.setMonth(dateObj.getMonth() + durationInMonths);
  return dateObj;
}

function formatDate(dateInput) {
  if (!dateInput) return 'N/A';
  const dateObj = dateInput instanceof Date ? dateInput : (dateInput.toDate ? dateInput.toDate() : new Date(dateInput));
  return dateObj instanceof Date ? dateObj.toLocaleDateString() : 'N/A';
}

document.addEventListener('DOMContentLoaded', () => {
  const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalLoanAmountElement = document.getElementById('total-loan-amount');
  const acceptedLoansDetailsElement = document.getElementById('active-loan-details');
  const upcomingPaymentsDetailsElement = document.getElementById('upcoming-payments-details');
  const loanHistoryBody = document.getElementById('loan-history-body');
  const applyLoanButton = document.getElementById('apply-loan-button');
  const logoutBtn = document.getElementById('logout-btn');

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "../index.html";
      return;
    }

    // Show user's name/email in the header
    const usernameEl = document.getElementById('username');
    if (usernameEl) {
      usernameEl.textContent = user.displayName || user.email?.split('@')[0] || 'User';
    }

    // Navigate to apply loan page on button click
    if (applyLoanButton) {
      applyLoanButton.addEventListener('click', () => {
        if (!applyLoanButton.disabled) window.location.href = 'apply-loan.html';
      });
    }

    await fetchAndDisplayData();

    async function fetchAndDisplayData() {
      if (totalLoanAmountElement) totalLoanAmountElement.textContent = 'Loading...';
      if (acceptedLoansDetailsElement) acceptedLoansDetailsElement.innerHTML = '<p class="text-muted">Loading...</p>';
      if (upcomingPaymentsDetailsElement) upcomingPaymentsDetailsElement.innerHTML = '<p class="text-muted">Loading...</p>';
      if (loanHistoryBody) loanHistoryBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

      try {
        const q = query(collection(db, "loan-applications"), where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);

        let userTotalLoanAmount = 0;
        const acceptedLoansDetailsArray = [];
        const upcomingPayments = [];
        const loanHistory = [];

        querySnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const loanId = docSnap.id;
          const loanAmount = data.loanAmount || 0;
          const loanType = data.loanType || 'N/A';
          const loanStatus = data.status || 'N/A';
          const createdAt = data.createdAt;
          const loanDuration = data.loanDuration;
          const interestRate = data.interestRate || 0;

          userTotalLoanAmount += loanAmount;

          const startDateObj = createdAt ? (createdAt.toDate ? createdAt.toDate() : new Date(createdAt)) : null;
          const endDateObj = calculateEndDate(startDateObj, loanDuration);
          const startDateStr = formatDate(startDateObj);
          const endDateStr = formatDate(endDateObj);

          loanHistory.push({ loanId, loanAmount, loanType, status: loanStatus, startDate: startDateStr, endDate: endDateStr });

          if (loanStatus.toLowerCase() === 'accepted') {
            const monthlyRate = interestRate / 100 / 12;
            const months = parseInt(loanDuration, 10) || 0;
            let emi = 0;
            if (monthlyRate > 0 && months > 0) {
              emi = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
            } else if (months > 0) {
              emi = loanAmount / months;
            }

            acceptedLoansDetailsArray.push({ loanId, loanAmount, loanType, loanDuration, interestRate, emi, endDateStr });

            if (endDateObj && endDateObj > new Date()) {
              const dueDate = new Date();
              dueDate.setDate(15);
              if (dueDate < new Date()) dueDate.setMonth(dueDate.getMonth() + 1);
              upcomingPayments.push({ loanId, loanType, emi, dueDate, endDate: endDateStr });
            }
          }
        });

        if (totalLoanAmountElement) totalLoanAmountElement.textContent = `$${fmt(userTotalLoanAmount)}`;

        if (acceptedLoansDetailsArray.length > 0) {
          acceptedLoansDetailsElement.innerHTML = acceptedLoansDetailsArray.map(loan => `
            <div class="payment-card">
              <div class="payment-meta">
                <div class="payment-meta-row"><span class="info-key">Loan ID</span><span class="loan-id-cell">${loan.loanId}</span></div>
                <div class="payment-meta-row"><span class="info-key">Type</span><span style="text-transform:capitalize">${loan.loanType}</span></div>
                <div class="payment-meta-row"><span class="info-key">Amount</span><strong>$${fmt(loan.loanAmount)}</strong></div>
                <div class="payment-meta-row"><span class="info-key">Duration</span>${loan.loanDuration} months</div>
                <div class="payment-meta-row"><span class="info-key">Rate</span>${loan.interestRate}% p.a.</div>
                <div class="payment-meta-row"><span class="info-key">End Date</span>${loan.endDateStr}</div>
              </div>
              <div class="payment-emi">
                <div class="emi-label">Monthly EMI</div>
                <div class="emi-value">$${fmt(loan.emi)}</div>
              </div>
            </div>
          `).join('');
        } else {
          acceptedLoansDetailsElement.innerHTML = '<p class="dash-empty">No accepted loans.</p>';
        }

        if (upcomingPayments.length > 0) {
          upcomingPaymentsDetailsElement.innerHTML = upcomingPayments.map(payment => {
            const dueDateStr = payment.dueDate.toLocaleDateString();
            return `
              <div class="payment-card">
                <div class="payment-meta">
                  <div class="payment-meta-row"><span class="info-key">Loan ID</span><span class="loan-id-cell">${payment.loanId}</span></div>
                  <div class="payment-meta-row"><span class="info-key">Type</span><span style="text-transform:capitalize">${payment.loanType}</span></div>
                  <div class="payment-meta-row"><span class="info-key">Due Date</span>${dueDateStr}</div>
                  <div class="payment-meta-row"><span class="info-key">End Date</span>${payment.endDate}</div>
                </div>
                <div class="payment-emi">
                  <div class="emi-label">EMI Due</div>
                  <div class="emi-value">$${fmt(payment.emi)}</div>
                  <button class="pay-now-btn" data-loan-id="${payment.loanId}" data-amount="${payment.emi.toFixed(2)}" data-due-date="${payment.dueDate.toISOString()}">Pay Now</button>
                </div>
              </div>
            `;
          }).join('');
        } else {
          upcomingPaymentsDetailsElement.innerHTML = '<p class="text-muted">No upcoming payments found.</p>';
        }

        loanHistoryBody.innerHTML = loanHistory.map(loan => `
          <tr>
            <td class="loan-id-cell" data-label="Loan ID">${loan.loanId}</td>
            <td data-label="Amount"><strong>$${fmt(loan.loanAmount)}</strong></td>
            <td data-label="Type" style="text-transform:capitalize">${loan.loanType}</td>
            <td data-label="Status"><span class="info-status ${loan.status.toLowerCase()}">${loan.status}</span></td>
            <td data-label="Start Date">${loan.startDate}</td>
            <td data-label="End Date">${loan.endDate}</td>
            <td data-label="Action">
              ${loan.status.toLowerCase() === 'pending'
                ? `<button class="cancel-loan-btn" data-loan-id="${loan.loanId}">Cancel</button>`
                : '—'}
            </td>
          </tr>
        `).join('');
        if (loanHistory.length === 0) {
          loanHistoryBody.innerHTML = '<tr><td colspan="7" class="text-center">No loan history found.</td></tr>';
        }

        const LOAN_LIMIT = 500000;
        const pct = Math.min(100, (userTotalLoanAmount / LOAN_LIMIT) * 100);
        const remaining = Math.max(0, LOAN_LIMIT - userTotalLoanAmount);
        const limitReached = userTotalLoanAmount >= LOAN_LIMIT;

        const fill = document.getElementById('llw-fill');
        const pctEl = document.getElementById('llw-pct');
        const usedEl = document.getElementById('llw-used');
        const remainEl = document.getElementById('llw-remain');

        if (fill)   { fill.style.width = `${pct}%`; fill.className = 'llw-fill' + (pct >= 100 ? ' danger' : pct >= 75 ? ' warning' : ''); }
        if (pctEl)  pctEl.textContent = `${Math.round(pct)}%`;
        if (usedEl) usedEl.textContent = `$${fmt(userTotalLoanAmount)} used`;
        if (remainEl) remainEl.textContent = limitReached ? 'Limit reached' : `$${fmt(remaining)} remaining`;

        if (applyLoanButton) {
          if (limitReached) {
            applyLoanButton.disabled = true;
            applyLoanButton.textContent = 'Limit Reached';
            applyLoanButton.classList.add('limit-reached');
          } else {
            applyLoanButton.disabled = false;
            applyLoanButton.textContent = '+ Apply for Loan';
            applyLoanButton.classList.remove('limit-reached');
          }
        }

        addLoanActionListeners();
        addPayNowListeners();

      } catch (error) {
        console.error("Error in fetchAndDisplayData:", error);
        if (totalLoanAmountElement) totalLoanAmountElement.textContent = 'Error';
        if (acceptedLoansDetailsElement) acceptedLoansDetailsElement.innerHTML = '<p class="text-danger">Error loading accepted loans.</p>';
        if (loanHistoryBody) loanHistoryBody.innerHTML = `<tr><td colspan="7" class="text-danger text-center">Error fetching history: ${error.message}. Please try again later.</td></tr>`;
        if (upcomingPaymentsDetailsElement) upcomingPaymentsDetailsElement.innerHTML = '<p class="text-danger">Error loading upcoming payments.</p>';
      }
    }

    function addLoanActionListeners() {
      document.querySelectorAll('.accept-loan-btn').forEach(button => button.replaceWith(button.cloneNode(true)));
      document.querySelectorAll('.reject-loan-btn').forEach(button => button.replaceWith(button.cloneNode(true)));

      loanHistoryBody.addEventListener('click', async (event) => {
        const target = event.target;
        const loanId = target.getAttribute('data-loan-id');
        if (!loanId) return;

        if (target.classList.contains('cancel-loan-btn')) {
          const confirmed = await Swal.fire({
            title: 'Cancel Application?',
            text: `Are you sure you want to cancel loan ${loanId}? This cannot be undone.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Yes, cancel it!'
          });
          if (confirmed.isConfirmed) await updateLoanStatus(loanId, 'Cancelled');
        }
      });
    }

    async function updateLoanStatus(loanId, newStatus) {
      try {
        const loanDocRef = doc(db, "loan-applications", loanId);
        await updateDoc(loanDocRef, { status: newStatus, actionTimestamp: serverTimestamp() });
        Swal.fire({ icon: 'success', title: 'Status Updated', text: `Loan ${loanId} status changed to ${newStatus}.`, timer: 2000, showConfirmButton: false });
        await fetchAndDisplayData();
      } catch (error) {
        Swal.fire({ icon: 'error', title: 'Update Failed', text: `Could not update loan status: ${error.message}` });
      }
    }

    function addPayNowListeners() {
      document.querySelectorAll('.pay-now-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const loanId = btn.dataset.loanId;
          let amount = parseFloat(btn.dataset.amount);
          const dueDate = new Date(btn.dataset.dueDate);
          const today = new Date();

          if (today.getDate() > 12) amount = Math.floor(amount * 1.02);

          try {
            const paymentsRef = collection(db, "loan-applications", loanId, "payments");
            await addDoc(paymentsRef, { amountPaid: amount, paidAt: serverTimestamp(), status: "completed", dueDate });
            await updateDoc(doc(db, "loan-applications", loanId), { lastPaidAt: serverTimestamp(), paymentStatus: "Paid" });
            btn.parentElement.innerHTML = `<span class="badge bg-success">Paid</span>`;
            Swal.fire({ icon: 'success', title: 'Payment Successful', text: `You paid $${amount.toFixed(2)} for Loan ${loanId}`, timer: 2000, showConfirmButton: false });
          } catch (error) {
            Swal.fire({ icon: 'error', title: 'Payment Failed', text: `Error: ${error.message}` });
          }
        });
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        Swal.fire({
          title: 'Are you sure?', text: "You will be logged out!", icon: 'warning',
          showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'Yes, logout'
        }).then(async (result) => {
          if (result.isConfirmed) {
            try {
              await signOut(auth);
              localStorage.removeItem('username');
              window.location.href = "homepage.html";
            } catch (err) { console.error("Logout error:", err); }
          }
        });
      });
    }
  });
});
