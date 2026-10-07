const fs = require('node:fs');

const fileName = 'a.txt';
let AdminData = [];

try {
  // 1. Agar a.txt file pehle se maujood hai, toh wahan se data parse karein
  if (fs.existsSync(fileName)) {
    const fileContent = fs.readFileSync(fileName, 'utf8');
    
    // Agar file khali nahi hai, toh use parse karein, nahi toh khali array [] dein
    AdminData = JSON.parse(fileContent || '[]');
  } else {
    // 2. Agar file nahi hai, toh ek baar khali array [] ke saath file bana dein
    fs.writeFileSync(fileName, JSON.stringify([], null, 2), 'utf8');
  }
} catch (err) {
  console.error("File se data parse karne mein error aaya, resetting to []:", err);
  AdminData = [];
}

// ---- AAPKA DATA AB 'AdminData' VARIABLE MEIN PARSE HO CHUKA HAI ----
console.log("Loaded AdminData successfully:", AdminData);


function saveAdminData() {
  try {
    fs.writeFileSync(fileName, JSON.stringify(AdminData, null, 2), 'utf8');
    console.log("AdminData wapas a.txt mein store ho gaya!");
  } catch (err) {
    console.error("Data save karne mein dikkat aayi:", err);
  }
}
