import { auth, db } from './firebase_config.js';
import { collection, getDocs, updateDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const loanTableBody = document.querySelector('#loan-table tbody');
const logoutBtn = document.getElementById('logout-btn');

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

// Load all loan applications
async function loadLoans() {
  const loansSnapshot = await getDocs(collection(db, 'loan-applications'));
  loanTableBody.innerHTML = '';

  loansSnapshot.forEach(loanDoc => {
    const loan = loanDoc.data();
    const row = document.createElement('tr');

    row.innerHTML = `
      <td data-label="User ID">${loan.userId}</td>
<td data-label="Amount">${loan.loanAmount}</td>
<td data-label="Type">${loan.loanType}</td>
<td data-label="Status"><span class="badge badge-${loan.status.toLowerCase()}">${loan.status}</span></td>
<td data-label="Purpose">${loan.loanPurpose || '--'}</td>
<td data-label="Interest">${loan.interestRate || '--'}%</td>
<td data-label="Duration">${loan.loanDuration || '--'} months</td>
<td data-label="Actions">
  ${loan.status.toLowerCase() === 'pending' ? `
    <button class="btn btn-success btn-sm approve-btn" data-id="${loanDoc.id}">Approve</button>
    <button class="btn btn-danger btn-sm reject-btn" data-id="${loanDoc.id}">Reject</button>
  ` : '—'}
</td>

    `;
    loanTableBody.appendChild(row);
  });

  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => updateLoanStatus(btn.dataset.id, 'Accepted'));
  });

  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => updateLoanStatus(btn.dataset.id, 'Rejected'));
  });
}

// Update loan status
async function updateLoanStatus(loanId, status) {
  await updateDoc(doc(db, 'loan-applications', loanId), { status });
  Swal.fire(`Loan ${status}!`, '', 'success');
  loadLoans();
}

// Logout
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../index.html';
  });
}
