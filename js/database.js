// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCXwbtaELHu_09qzxYkeBuc33Qh0wTr-Uw",
  authDomain: "flappy-binnie.firebaseapp.com",
  projectId: "flappy-binnie",
  storageBucket: "flappy-binnie.firebasestorage.app",
  messagingSenderId: "307151469736",
  appId: "1:307151469736:web:3103ca289bc4dedc7f169d",
  measurementId: "G-NSXFLXRS2N",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
