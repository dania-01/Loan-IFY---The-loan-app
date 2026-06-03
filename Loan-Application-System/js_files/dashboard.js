import { auth, db } from './firebase_config.js'; // Ensure this path is correct
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, getDocs, query, where, updateDoc, doc, getDoc, serverTimestamp, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

function calculateEndDate(startDate, durationInMonthsStr) {
  const durationInMonths = parseInt(durationInMonthsStr, 10);
  if (!(startDate instanceof Date) || isNaN(durationInMonths) || durationInMonths <= 0) {
    console.warn("Invalid input for calculateEndDate:", startDate, durationInMonthsStr);
    return 'N/A';
  }
  let date = new Date(startDate.getTime());
  date.setMonth(date.getMonth() + durationInMonths);

  if (date.getDate() < startDate.getDate()) {
    date.setDate(0);
  }
  return date;
}

function formatDate(dateObj) {
  return dateObj instanceof Date ? dateObj.toLocaleDateString() : 'N/A';
}

document.addEventListener('DOMContentLoaded', () => {
  const usernameElement = document.getElementById('username');
  const totalLoanAmountElement = document.getElementById('total-loan-amount');
  const acceptedLoansDetailsElement = document.getElementById('active-loan-details');
  // stat-tile-loan-detail: target for accepted loan info cards
  const upcomingPaymentsDetailsElement = document.getElementById('upcoming-payments-details');
  const loanHistoryBody = document.getElementById('loan-history-body');
  const logoutBtn = document.getElementById('logout-btn');
  const applyLoanButton = document.getElementById('apply-loan-button');

  let userGlobal = null;
  let userTotalLoanAmount = 0;
  const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Apply button navigates only when not disabled
  applyLoanButton?.addEventListener('click', () => {
    if (!applyLoanButton.disabled) window.location.href = 'apply-loan.html';
  });

  onAuthStateChanged(auth, async (user) => {
    userGlobal = user;
    if (user) {
      // Redirect admins to their own panel
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          window.location.href = 'admin.html';
          return;
        }
      } catch(err) { console.warn('Role check failed', err); }

      usernameElement.textContent = user.email || "User";
      clearDashboardData();
      await fetchAndDisplayData();
    } else {
      usernameElement.textContent = "Not Logged In";
      clearDashboardData();
      applyLoanButton.disabled = true;
      applyLoanButton.textContent = "Login to Apply";
    }
  });

  function clearDashboardData() {
    totalLoanAmountElement.textContent = '$0.00';
    acceptedLoansDetailsElement.innerHTML = '<p class="text-muted">Loading...</p>';
    upcomingPaymentsDetailsElement.innerHTML = '<p class="text-muted">Loading...</p>';
    loanHistoryBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>'; // Use colspan="7"
  }

  async function fetchAndDisplayData() {
    if (!userGlobal?.uid) {
      console.warn("User not logged in or UID not available.");
      clearDashboardData();
      return;
    }

    console.log(`Fetching data for user: ${userGlobal.uid}`);
    try {
      const loansCollectionRef = collection(db, "loan-applications");
      const q = query(loansCollectionRef, where("userId", "==", userGlobal.uid));
      const querySnapshot = await getDocs(q);

      let totalLoanAmountApplied = 0;
      const loanHistory = [];
      const acceptedLoansDetailsArray = [];
      let upcomingPayments = [];

      console.log("Loan Query Snapshot Size:", querySnapshot.size);

      for (const loanDoc of querySnapshot.docs) {
        const loanData = loanDoc.data();
        const loanId = loanDoc.id;
        const loanAmount = typeof loanData.loanAmount === 'number' ? loanData.loanAmount : 0;
        const loanStatus = loanData.status || 'N/A';
        const loanType = loanData.loanType || 'N/A';
        const interestRate = loanData.interestRate || 0;
        const tenure = loanData.loanDuration || 1;

        totalLoanAmountApplied += loanAmount;

        const startDate = loanData.createdAt?.seconds
          ? new Date(loanData.createdAt.seconds * 1000)
          : null;
        const endDateObj = calculateEndDate(startDate, tenure);
        const endDateStr = formatDate(endDateObj);

        loanHistory.push({
          loanId: loanId,
          loanAmount: loanAmount,
          loanType: loanType,
          status: loanStatus,
          startDate: formatDate(startDate),
          endDate: endDateStr,
        });

        if (loanStatus === 'Accepted') {
          acceptedLoansDetailsArray.push({
            id: loanId,
            amount: loanAmount,
            type: loanType,
            status: loanStatus,
            startDate: formatDate(startDate),
            endDate: endDateStr
          });

          const monthlyRate = interestRate / 100 / 12;
          const emi = monthlyRate === 0
            ? loanAmount / tenure
            : loanAmount * monthlyRate * Math.pow(1 + monthlyRate, tenure) / (Math.pow(1 + monthlyRate, tenure) - 1);

          // Next due date = 12th of next month
          const now = new Date();
          let dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 12);

          upcomingPayments.push({
            loanId,
            loanType,
            dueDate,
            amount: emi
          });
        }
      }

      upcomingPayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

      totalLoanAmountElement.textContent = `$${fmt(totalLoanAmountApplied)}`;
      userTotalLoanAmount = totalLoanAmountApplied;

      if (acceptedLoansDetailsArray.length > 0) {
        acceptedLoansDetailsElement.innerHTML = acceptedLoansDetailsArray.map(loan => `
          <div class="loan-info-card">
            <div class="loan-info-row">
              <span class="info-key">Loan ID</span>
              <span class="info-val info-mono">${loan.id}</span>
            </div>
            <div class="loan-info-row">
              <span class="info-key">Amount</span>
              <span class="info-val info-amount">$${fmt(loan.amount)}</span>
            </div>
            <div class="loan-info-row">
              <span class="info-key">Type</span>
              <span class="info-val">${loan.type}</span>
            </div>
            <div class="loan-info-row">
              <span class="info-key">Status</span>
              <span class="info-val info-status accepted">${loan.status}</span>
            </div>
            <div class="loan-info-row">
              <span class="info-key">End Date</span>
              <span class="info-val">${loan.endDate}</span>
            </div>
          </div>
        `).join('');
      } else {
        acceptedLoansDetailsElement.innerHTML = '<p class="dash-empty">No accepted loans.</p>';
      }

      if (upcomingPayments.length > 0) {
        upcomingPaymentsDetailsElement.innerHTML = upcomingPayments.map(payment => {
          const loan = querySnapshot.docs.find(d => d.id === payment.loanId)?.data();
          const isPaid = loan?.paymentStatus === "Paid";

          return `
            <div class="payment-card">
              <div class="payment-card-body">
                <div class="payment-meta-row">
                  <span class="info-key">Loan ID</span>
                  <span class="info-val info-mono">${payment.loanId} <span class="payment-type">(${payment.loanType})</span></span>
                </div>
                <div class="payment-meta-row">
                  <span class="info-key">Due Date</span>
                  <span class="info-val">${formatDate(payment.dueDate)}</span>
                </div>
                <div class="payment-meta-row">
                  <span class="info-key">Amount Due</span>
                  <span class="info-val info-amount">$${fmt(payment.amount)}</span>
                </div>
              </div>
              <div class="payment-card-action">
                ${isPaid
                  ? `<span class="info-status accepted">Paid</span>`
                  : `<button class="pay-now-btn" data-loan-id="${payment.loanId}" data-amount="${payment.amount}" data-due-date="${payment.dueDate}">Pay Now</button>`}
              </div>
            </div>
          `;
        }).join('');

      } else {
        upcomingPaymentsDetailsElement.innerHTML = '<p class="text-muted">No upcoming payments found.</p>';
      }

      loanHistoryBody.innerHTML = loanHistory.map(loan => `
        <tr>
          <td class="loan-id-cell">${loan.loanId}</td>
          <td><strong>$${fmt(loan.loanAmount)}</strong></td>
          <td style="text-transform:capitalize">${loan.loanType}</td>
          <td><span class="info-status ${loan.status.toLowerCase()}">${loan.status}</span></td>
          <td>${loan.startDate}</td>
          <td>${loan.endDate}</td>
          <td>
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

      // Update progress bar
      const fill = document.getElementById('llw-fill');
      const pctEl = document.getElementById('llw-pct');
      const usedEl = document.getElementById('llw-used');
      const remainEl = document.getElementById('llw-remain');

      if (fill)   { fill.style.width = `${pct}%`; fill.className = 'llw-fill' + (pct >= 100 ? ' danger' : pct >= 75 ? ' warning' : ''); }
      if (pctEl)  pctEl.textContent = `${Math.round(pct)}%`;
      if (usedEl) usedEl.textContent = `$${fmt(userTotalLoanAmount)} used`;
      if (remainEl) remainEl.textContent = limitReached ? 'Limit reached' : `$${fmt(remaining)} remaining`;

      // Apply button — no <a> wrapper so disabled truly blocks navigation
      if (limitReached) {
        applyLoanButton.disabled = true;
        applyLoanButton.textContent = 'Limit Reached';
        applyLoanButton.classList.add('limit-reached');
      } else {
        applyLoanButton.disabled = false;
        applyLoanButton.textContent = '+ Apply for Loan';
        applyLoanButton.classList.remove('limit-reached');
      }

      addLoanActionListeners();
      addPayNowListeners();

    } catch (error) {
      console.error("Error in fetchAndDisplayData:", error);
      totalLoanAmountElement.textContent = 'Error';
      acceptedLoansDetailsElement.innerHTML = '<p class="text-danger">Error loading accepted loans.</p>';
      loanHistoryBody.innerHTML = `<tr><td colspan="7" class="text-danger text-center">Error fetching history: ${error.message}. Please try again later.</td></tr>`; 
      upcomingPaymentsDetailsElement.innerHTML = '<p class="text-danger">Error loading upcoming payments.</p>';
    }
  }

  function addLoanActionListeners() {
    document.querySelectorAll('.accept-loan-btn').forEach(button => button.replaceWith(button.cloneNode(true)));
    document.querySelectorAll('.reject-loan-btn').forEach(button => button.replaceWith(button.cloneNode(true)));

    loanHistoryBody.addEventListener('click', async (event) => {
      const target = event.target;
      const loanId = target.getAttribute('data-loan-id');

      if (!loanId) return;

      if (target.classList.contains('accept-loan-btn')) {
        const confirmed = await Swal.fire({
          title: 'Accept Loan?',
          text: `Do you want to accept loan ${loanId}?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#28a745',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes, accept it!'
        });
        if (confirmed.isConfirmed) {
          await updateLoanStatus(loanId, 'Accepted');
        }
      } else if (target.classList.contains('reject-loan-btn')) {
        const confirmed = await Swal.fire({
          title: 'Reject Loan?',
          text: `Do you want to reject loan ${loanId}? This cannot be undone easily.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes, reject it!'
        });
        if (confirmed.isConfirmed) {
          await updateLoanStatus(loanId, 'Rejected');
        }
      } else if (target.classList.contains('cancel-loan-btn')) {
        const confirmed = await Swal.fire({
          title: 'Cancel Application?',
          text: `Are you sure you want to cancel loan ${loanId}? This cannot be undone.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#dc3545',
          cancelButtonColor: '#6c757d',
          confirmButtonText: 'Yes, cancel it!'
        });
        if (confirmed.isConfirmed) {
          await updateLoanStatus(loanId, 'Cancelled');
        }
      }
    });
  }

  async function updateLoanStatus(loanId, newStatus) {
    try {
      console.log(`Attempting to update loan ${loanId} to status ${newStatus}`);
      const loanDocRef = doc(db, "loan-applications", loanId);
      await updateDoc(loanDocRef, {
        status: newStatus,
        actionTimestamp: serverTimestamp()
      });
      console.log(`Loan status successfully updated to ${newStatus} for loan ID: ${loanId}`);
      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: `Loan ${loanId} status changed to ${newStatus}.`,
        timer: 2000,
        showConfirmButton: false
      });
      await fetchAndDisplayData();
    } catch (error) {
      console.error(`Error updating loan ${loanId} status to ${newStatus}:`, error);
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: `Could not update loan status: ${error.message}`,
      });
    }
  }

  function addPayNowListeners() {
  document.querySelectorAll('.pay-now-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const loanId = btn.dataset.loanId;
      let amount = parseFloat(btn.dataset.amount);
      const dueDate = new Date(btn.dataset.dueDate);
      const today = new Date();

      // ✅ Late fee if paying after 12th
      if (today.getDate() > 12) {
        amount = Math.floor(amount * 1.02); // +2% late fee
      }

      try {
        // 1️⃣ Record the payment in subcollection
        const paymentsRef = collection(db, "loan-applications", loanId, "payments");
        await addDoc(paymentsRef, {
          amountPaid: amount,
          paidAt: serverTimestamp(),
          status: "completed",
          dueDate
        });

        // 2️⃣ Update loan doc with status
        await updateDoc(doc(db, "loan-applications", loanId), {
          lastPaidAt: serverTimestamp(),
          paymentStatus: "Paid"
        });

        // 3️⃣ Update UI instantly → replace button with Paid tag
        const cell = btn.parentElement;
        cell.innerHTML = `<span class="badge bg-success">Paid</span>`;

        // 4️⃣ Success message
        Swal.fire({
          icon: 'success',
          title: 'Payment Successful',
          text: `You paid $${amount.toFixed(2)} for Loan ${loanId}`,
          timer: 2000,
          showConfirmButton: false
        });

      } catch (error) {
        console.error("Payment error:", error);
        Swal.fire({
          icon: 'error',
          title: 'Payment Failed',
          text: `Error: ${error.message}`
        });
      }
    });
  });
}

 if (logoutBtn) {
  logoutBtn.addEventListener("click", (e) => {
    e.preventDefault();

    Swal.fire({
      title: 'Are you sure?',
      text: "You will be logged out!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await signOut(auth); // <-- actually sign out from Firebase
          localStorage.removeItem('username'); // optional
          window.location.href = "homepage.html";
        } catch (err) {
          console.error("Logout error:", err);
        }
      }
    });
  });
}
});
