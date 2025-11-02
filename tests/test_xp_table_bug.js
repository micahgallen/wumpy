const table = {1: 0, 2: 1000, 50: 1225000};

console.log('Level 1 with ||:', table[1] || table[50] * 2);
console.log('Level 1 with !== undefined:', table[1] !== undefined ? table[1] : table[50] * 2);
console.log('Level 2 with ||:', table[2] || table[50] * 2);
console.log('Level 100 with ||:', table[100] || table[50] * 2);

// This is the bug - 0 is falsy, so || fallback triggers!
