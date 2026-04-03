// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXwbtaELHu_09qzxYkeBuc33Qh0wTr-Uw", // Put your real key back here
  authDomain: "flappy-binnie.firebaseapp.com",
  projectId: "flappy-binnie",
  storageBucket: "flappy-binnie.firebasestorage.app",
  messagingSenderId: "307151469736",
  appId: "1:307151469736:web:3103ca289bc4dedc7f169d",
  measurementId: "G-NSXFLXRS2N",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Initialize Firestore and EXPORT it
export const db = getFirestore(app);

// 3. Create and EXPORT the save function so game.js can see it
export async function savePlayerData(
  uid,
  username,
  highScore,
  coins,
  unlockedAchievements,
) {
  if (!uid || !username) return;

  try {
    // THE FIX: Use the hidden 'uid' as the database folder name, NOT the username!
    const userRef = doc(db, "users", uid);

    await setDoc(
      userRef,
      {
        username: username, // The username is now just a label inside the folder
        highScore: highScore,
        coins: coins,
        unlockedAchievements: unlockedAchievements,
        lastPlayed: new Date(),
      },
      { merge: true },
    );

    console.log("Data synced to Firebase!");
  } catch (error) {
    console.error("Firebase Sync Error:", error);
  }
}

// 4. Fetch Leaderboard Data
export async function getLeaderboardData(topN = 50) {
  try {
    const usersRef = collection(db, "users");
    // Query: Sort by highScore (descending) and limit to topN
    const q = query(usersRef, orderBy("highScore", "desc"), limit(topN));

    const querySnapshot = await getDocs(q);
    let leaderboard = [];

    querySnapshot.forEach((doc) => {
      leaderboard.push(doc.data());
    });

    return leaderboard;
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return [];
  }
}

// --- 5. REAL-TIME LEADERBOARD SUBSCRIPTION ---
export function subscribeToLeaderboard(topN, callback) {
  const usersRef = collection(db, "users");
  const q = query(usersRef, orderBy("highScore", "desc"), limit(topN));

  // onSnapshot creates a live connection to the database!
  // It returns an "unsubscribe" function that we can call later to stop listening.
  return onSnapshot(
    q,
    (querySnapshot) => {
      let leaderboard = [];
      querySnapshot.forEach((doc) => {
        leaderboard.push(doc.data());
      });

      // Send the live data back to main.js to draw it
      callback(leaderboard);
    },
    (error) => {
      console.error("Live Leaderboard Error:", error);
    },
  );
}
