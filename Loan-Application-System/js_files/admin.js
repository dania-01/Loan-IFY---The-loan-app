import { auth, db } from './firebase_config.js';
import { collection, getDocs, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const userEmailCache = {};

const loanTableBody = document.querySelector('#loan-table tbody');
const logoutBtn = document.getElementById('logout-btn');
const statusFilter = document.getElementById('status-filter');

let allRows = [];

if (statusFilter) {
  statusFilter.addEventListener('change', () => {
    const val = statusFilter.value.toLowerCase();
    allRows.forEach(({ row, status }) => {
      row.style.display = (val === 'all' || status === val) ? '' : 'none';
    });
  });
}

// Check role on page load
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = '../index.html';
    return;
  }

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  const role = userDoc.exists() ? userDoc.data().role : null;

  if (role !== 'admin') {
    Swal.fire({
      icon: 'error',
      title: 'Access Denied',
      text: 'You are not authorized to access this page!'
    }).then(() => window.location.href = '../index.html');
    return;
  }

  // Load loans if admin
  loadLoans();
});

async function getUserEmail(uid) {
  if (userEmailCache[uid]) return userEmailCache[uid];
  const userDoc = await getDoc(doc(db, 'users', uid));
  const email = userDoc.exists() ? userDoc.data().email : uid;
  userEmailCache[uid] = email;
  return email;
}

function updateStats(loans) {
  const total    = loans.length;
  const pending  = loans.filter(l => l.status?.toLowerCase() === 'pending').length;
  const accepted = loans.filter(l => l.status?.toLowerCase() === 'accepted').length;
  const rejected = loans.filter(l => l.status?.toLowerCase() === 'rejected').length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('stat-total',    total);
  set('stat-pending',  pending);
  set('stat-approved', accepted);
  set('stat-rejected', rejected);
}

// Load all loan applications
async function loadLoans() {
  const loansSnapshot = await getDocs(collection(db, 'loan-applications'));
  loanTableBody.innerHTML = '';
  allRows = [];

  const allLoanData = loansSnapshot.docs.map(d => d.data());
  updateStats(allLoanData);

  for (const loanDoc of loansSnapshot.docs) {
    const loan = loanDoc.data();
    const userEmail = await getUserEmail(loan.userId);
    const row = document.createElement('tr');

    row.innerHTML = `
      <td data-label="User Email">${userEmail}</td>
      <td data-label="Amount">$${Number(loan.loanAmount).toLocaleString()}</td>
      <td data-label="Type">${loan.loanType}</td>
      <td data-label="Status"><span class="badge badge-${loan.status.toLowerCase()}">${loan.status}</span></td>
      <td data-label="Purpose">${loan.loanPurpose || '--'}</td>
      <td data-label="Interest">${loan.interestRate || '--'}%</td>
      <td data-label="Duration">${loan.loanDuration || '--'} months</td>
      <td data-label="Actions">
        ${loan.status.toLowerCase() === 'pending' ? `
          <button class="btn-sm btn-success approve-btn" data-id="${loanDoc.id}">Approve</button>
          <button class="btn-sm btn-danger reject-btn" data-id="${loanDoc.id}">Reject</button>
        ` : '—'}
      </td>
    `;
    loanTableBody.appendChild(row);
    allRows.push({ row, status: loan.status.toLowerCase() });
  }

  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmStatusChange(btn.dataset.id, 'Accepted'));
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => confirmStatusChange(btn.dataset.id, 'Rejected'));
  });
}

// Confirm before changing loan status
function confirmStatusChange(loanId, status) {
  const isApprove = status === 'Accepted';
  Swal.fire({
    title: isApprove ? 'Approve this loan?' : 'Reject this loan?',
    text: `Loan ID: ${loanId}`,
    icon: isApprove ? 'question' : 'warning',
    showCancelButton: true,
    confirmButtonText: isApprove ? 'Yes, approve' : 'Yes, reject',
    cancelButtonText: 'Cancel',
    reverseButtons: true
  }).then(async (result) => {
    if (result.isConfirmed) await updateLoanStatus(loanId, status);
  });
}

// Update loan status
async function updateLoanStatus(loanId, status) {
  try {
    await updateDoc(doc(db, 'loan-applications', loanId), { status });
    Swal.fire({
      icon: 'success',
      title: `Loan ${status}`,
      timer: 1800,
      showConfirmButton: false
    });
    loadLoans();
  } catch (err) {
    Swal.fire({ icon: 'error', title: 'Update failed', text: err.message });
  }
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    Swal.fire({
      title: 'Log out?',
      text: 'You will be returned to the login page.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await signOut(auth);
          window.location.href = '../index.html';
        } catch (err) {
          console.error('Logout error:', err);
        }
      }
    });
  });
}
