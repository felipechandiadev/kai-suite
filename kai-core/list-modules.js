const fs = require('fs');
const path = require('path');

// List modules from file system
const modulesDir = './src/modules';
const allModuleEntries = fs.readdirSync(modulesDir)
  .filter(f => fs.statSync(path.join(modulesDir, f)).isDirectory())
  .sort();

console.log(`Total modules found: ${allModuleEntries.length}`);
console.log('Modules:');
allModuleEntries.forEach((m, i) => {
  console.log(`${i+1}. ${m}`);
});
