const fs = require('fs');
const { execSync } = require('child_process');

let inputData = {};
try {
  const inputString = fs.readFileSync(0, 'utf8');
  if (inputString.trim()) {
    inputData = JSON.parse(inputString);
  }
} catch (e) {
  // Ignore parse errors or empty stdin
}

// Prevent infinite loops if stop_hook_active is true
if (inputData.stop_hook_active) {
  process.exit(0);
}

// Check 1: Task Checklist in .claude/current_task.md
const taskFilePath = './.claude/current_task.md';
if (fs.existsSync(taskFilePath)) {
  const content = fs.readFileSync(taskFilePath, 'utf8');
  if (/- \s*\[\s*\]/m.test(content)) {
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'Tasks remaining in .claude/current_task.md. Complete all unchecked items before stopping.'
    }));
    process.exit(0);
  }
}

// Check 2: Type Integrity if tsconfig.json exists
const tsconfigPath = './tsconfig.json';
if (fs.existsSync(tsconfigPath)) {
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
  } catch (error) {
    const errorOutput = (error.stdout ? error.stdout.toString() : '') +
                        (error.stderr ? error.stderr.toString() : error.message);
    console.log(JSON.stringify({
      decision: 'block',
      reason: 'TypeScript errors detected. Fix all type errors before finishing:\n' + errorOutput
    }));
    process.exit(0);
  }
}

process.exit(0);
