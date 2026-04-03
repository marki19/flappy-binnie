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
  username,
  highScore,
  coins,
  unlockedAchievements,
) {
  if (!username) return;

  try {
    const userRef = doc(db, "users", username);
    await setDoc(
      userRef,
      {
        username: username,
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
