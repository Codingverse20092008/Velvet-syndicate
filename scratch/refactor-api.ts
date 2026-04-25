import * as fs from 'fs';
import * as path from 'path';

const SRC_DIR = path.join(process.cwd(), 'app', 'api');
const LIB_DIR = path.join(process.cwd(), 'lib');
const MIDDLEWARE = path.join(process.cwd(), 'middleware.ts');

function processFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Only process files that have NextResponse.json
  if (!content.includes('NextResponse.json')) return;

  // Make sure we have the imports if we're going to use them
  if (!content.includes('successResponse') && !content.includes('errorResponse')) {
    const importStatement = `import { successResponse, errorResponse } from '@/lib/api-response';\n`;
    // Insert after the first import or at top
    if (content.startsWith('import')) {
      content = content.replace(/(import.*?\n)/, `$1${importStatement}`);
    } else {
      content = importStatement + content;
    }
    hasChanges = true;
  }

  // Find all NextResponse.json({...}) and try to standardize
  // Let's use a simpler approach: replace the common patterns
  
  // Pattern 1: { error: 'Message' }
  content = content.replace(/NextResponse\.json\(\s*\{\s*error:\s*(['"`][\s\S]*?['"`])\s*\}[\s,]*\{\s*status:\s*(\d+)\s*\}[\s,]*\)/g, (match, msg, status) => {
    hasChanges = true;
    let code = 'INTERNAL_ERROR';
    if (status == 400) code = 'VALIDATION_ERROR';
    if (status == 401) code = 'UNAUTHORIZED';
    if (status == 403) code = 'UNAUTHORIZED';
    if (status == 404) code = 'NOT_FOUND';
    if (status == 429) code = 'RATE_LIMITED';
    return `errorResponse(${msg}, '${code}', ${status})`;
  });

  // Pattern 2: { success: false, error: 'Msg', code: 'CODE' }
  content = content.replace(/NextResponse\.json\(\s*\{\s*success:\s*false\s*,\s*error:\s*(['"`][\s\S]*?['"`])\s*,\s*code:\s*(['"`][\s\S]*?['"`])[\s,]*(?:data:\s*null[\s,]*)?\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g, (match, msg, code, status) => {
    hasChanges = true;
    return `errorResponse(${msg}, ${code}, ${status})`;
  });

  // Pattern 3: { success: true, data: { ... }, error: null, code: null }
  content = content.replace(/NextResponse\.json\(\s*\{\s*success:\s*true\s*,\s*data:\s*([\s\S]*?)\s*,\s*error:\s*null\s*,\s*code:\s*null[\s,]*\}\s*\)/g, (match, data) => {
    hasChanges = true;
    return `successResponse(${data})`;
  });

  // Pattern 4: { success: false, error: ..., code: ..., data: ... } with different order
  content = content.replace(/NextResponse\.json\([\s\S]*?\{\s*success:\s*false\s*,[\s\S]*?error:\s*(['"`][\s\S]*?['"`])\s*,[\s\S]*?code:\s*(['"`][\s\S]*?['"`])[\s\S]*?\}\s*,\s*\{\s*status:\s*(\d+)\s*\}\s*\)/g, (match, msg, code, status) => {
    // Only if not already processed
    if (match.includes('successResponse') || match.includes('errorResponse')) return match;
    hasChanges = true;
    return `errorResponse(${msg}, ${code}, ${status})`;
  });

  // Pattern 5: { success: true, data: ... } without error/code explicitly null
  content = content.replace(/NextResponse\.json\([\s\S]*?\{\s*success:\s*true\s*,\s*data:\s*([\s\S]+?)\s*\}[\s,]*\)/g, (match, data) => {
    if (match.includes('error:') || match.includes('status:')) return match;
    hasChanges = true;
    // ensure no trailing closing brace issue
    data = data.trim().replace(/\}$/, '').trim();
    return `successResponse(${data})`;
  });

  // If we couldn't replace it but it exists, log it
  if (content.includes('NextResponse.json')) {
    console.log(`Still has NextResponse.json: ${filePath}`);
  }

  // Pattern 4: { success: true, data: ..., ... } -> successResponse(...)
  // ... this is tricky with regex. Let's do it manually if it doesn't match.

  if (hasChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function walk(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      processFile(fullPath);
    }
  }
}

console.log('Processing files...');
if (fs.existsSync(SRC_DIR)) walk(SRC_DIR);
if (fs.existsSync(LIB_DIR)) walk(LIB_DIR);
if (fs.existsSync(MIDDLEWARE)) processFile(MIDDLEWARE);
console.log('Done.');
