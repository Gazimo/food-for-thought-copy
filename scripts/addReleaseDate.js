const fs = require('fs');
const path = require('path');

// Correct path to the dish data
const dishesPath = path.join(__dirname, '..', 'public', 'data', 'sample_dishes.json');
const dishes = JSON.parse(fs.readFileSync(dishesPath, 'utf8'));

// Start date (editable if needed)
const startDate = new Date('2025-05-28');

const updatedDishes = dishes.map((dish, index) => {
  const releaseDate = new Date(startDate);
  releaseDate.setDate(startDate.getDate() + index);
  return {
    ...dish,
    releaseDate: releaseDate.toISOString().split('T')[0], // Format: YYYY-MM-DD
  };
});

// Overwrite the original file
fs.writeFileSync(dishesPath, JSON.stringify(updatedDishes, null, 2));

console.log(`✅ Overwrote sample_dishes.json with ${updatedDishes.length} dishes including release dates.`);
