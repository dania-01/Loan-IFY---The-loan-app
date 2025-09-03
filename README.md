# Project Title
Loan Application System

## Introduction
Loan-IFY is a modern, user-friendly Loan Application System designed to simplify the process of applying, tracking, and
managing loans for users.
It offers a seamless dashboard experience where users can:
• View their total loans, active loans, and upcoming payments.
• Apply for new loans easily through a guided form.
• Track their loan history with detailed status updates.
• Manage sessions with a secure logout feature and optional theme toggle (light/dark mode) and have responsive design.
• The system is built using HTML, CSS (Bootstrap), JavaScript, and SweetAlert2 for enhanced user interactions.
• Data management and authentication are handled using Firebase, ensuring real-time updates and secure data flow.

## Project Type
Frontend | Backend | Fullstack

## Deployed App
Frontend: https://loan-application-sys0101.netlify.app
Backend: Firebase (Authentication & Firestore)
Database: Firebase Firestore

## Directory Structure
Loan-Application-System/
├─ assests_file/
│ ├── hdfcLogo.png
│ ├── Loan-ifyfinal.png
│ ├── Loanifyi-titlelogo.png
│ ├── relaince logo.png
│ ├── SBIlogo.webp
│ └── team-meeting-1.webp
├── css_files/
│ ├── apply-loan.css
│ ├── dashboard.css
│ ├── homepage.css
│ ├── index.css
│ └── signup.css
├── html_files/
│ ├── apply-loan.html
│ ├── contact.html
│ ├── dashboard.html
│ ├── homepage.html
│ ├── signup.html
├── js_files/
│ ├── apply-loan.js
│ ├── auth.js
│ ├── dashboard.js
│ └── firebase_config.js
├── index.html
└── README.md

## Video Walkthrough of the project
https://drive.google.com/file/d/1tgFGQOsOXRSX-Gf_9MZ6WmLGH9ZqgLiJ/view?usp=sharing

## Video Walkthrough of the codebase
https://drive.google.com/file/d/1uDT-qvC-_gSr7DfjJzm4qpojHZP9SQvy/view?usp=sharing

## Features
• Loan Dashboard: View total loan amounts, active loans, and upcoming payments.
• Loan Application: Easily apply for loans using a guided form with emi calculator.
• Loan History Tracking: Keep track of previous loans with their status and details.
• Responsive Design: Fully responsive design powered by Bootstrap for all screen sizes.
• Theme Toggle: Optional dark/light mode for better user experience.
• SweetAlert2 Notifications: Display interactive popups for loan success, logout, and other actions.
• User Authentication: Manage sessions with Firebase authentication (email/password and phone OTP).
• Secure Logout: Ensure secure user logouts with SweetAlert2 popups for confirmation.

## Design decisions or assumptions
• Firebase Authentication was chosen for easy and secure user authentication.
• The use of Bootstrap ensures a responsive, mobile-first design.
• SweetAlert2 was implemented for stylish and interactive alerts and popups to enhance the user experience.
• Dark Mode and Light Mode are optional for the convenience of users based on their preferences.

## Installation & Getting started
(To run the project in a local environment, even though there’s no actual need to install dependencies like npm install since
we're relying on CDN links for Firebase and other libraries.)
```bash
git clone https://github.com/your-repo-name/loan-ify.git
cd Loan-Application-System
code .
```
(To make the project work, you need to configure Firebase.)
• Install Live Server Extension in Visual Studio Code.
• Open your index.html file.
• Start Live Server: Right-click on the index.html file and select "Open with Live Server".
• Access the App: Your app will open in a browser.

## Usage
• Login: Use your credentials to log in or sign up using Firebase Authentication.
• Dashboard: View your loan details, apply for loans, and track loan history.
• Apply for Loan: Click the “Apply for Loan” button to open the loan application form.
• Theme Toggle: Switch between light and dark themes using the toggle button on the navbar.
• Logout: When done, use the “Logout” button to securely end your session.

## Credentials
#user--->
Email: ayasha01@gmail.com
Password: 123456

#admin
Email:daniakhan0412@gmail.com
Password:12345678

## APIs Used
• Firebase Authentication API – used for authenticating users (email/password & OTP).
• Firebase Firestore – real-time database for storing and retrieving loan info.

## API Endpoints
Since Firebase is used, no typical REST API endpoints exist. Instead:
• GET – Retrieves all loans associated with the logged-in user from Firestore.
• POST – Submits a new loan application to Firebase Firestore.

## Technology Stack
• HTML/CSS, Bootstrap 5, JavaScript
• SweetAlert2
• Firebase (Auth & Firestore)
• Git
