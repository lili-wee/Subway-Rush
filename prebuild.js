import fs from 'fs';
import path from 'path';

try {
  console.log('[PREBUILD] Checking directory casing for case-sensitive systems (Vercel/Linux)...');

  // If Src exists but src does not, rename it
  if (!fs.existsSync('src')) {
    if (fs.existsSync('Src')) {
      fs.renameSync('Src', 'src');
      console.log('[PREBUILD] Renamed folder: Src -> src');
    } else if (fs.existsSync('SRC')) {
      fs.renameSync('SRC', 'src');
      console.log('[PREBUILD] Renamed folder: SRC -> src');
    } else {
      console.log('[PREBUILD] Folder "src" does not exist and no fallback folders (Src, SRC) were found.');
    }
  } else {
    console.log('[PREBUILD] Folder "src" verified.');
  }

  // Clean up any stale duplicate file that causes TS1149
  const mainLower = 'src/main.tsx';
  const mainUpper = 'src/Main.tsx';
  if (fs.existsSync(mainUpper) && fs.existsSync(mainLower)) {
    fs.unlinkSync(mainUpper);
    console.log('[PREBUILD] Cleaned up duplicate Main.tsx to prevent TS1149 compiler error.');
  }
} catch (error) {
  console.warn('[PREBUILD] Dynamic case alignment skipped:', error);
}
