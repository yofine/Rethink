const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true
});

const BASE_TEMPLATE = fs.readFileSync(path.join(__dirname, 'src', 'base.html'), 'utf8');

// Content directories
const CONTENT_DIRS = [
  { src: 'content/translations', dest: 'translations' },
  { src: 'content/blog', dest: 'blog' }
];

function getMeta(lines) {
  const meta = {};
  let inFrontmatter = false;
  let contentLines = [];
  
  for (const line of lines) {
    if (line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      continue;
    }
    if (inFrontmatter) {
      const [key, ...vals] = line.split(':');
      if (key && vals.length) {
        meta[key.trim()] = vals.join(':').trim().replace(/^["']|["']$/g, '');
      }
    } else {
      contentLines.push(line);
    }
  }
  
  return { meta, content: contentLines.join('\n') };
}

function buildPost(srcPath, destPath, type) {
  const mdContent = fs.readFileSync(srcPath, 'utf8');
  const lines = mdContent.split('\n');
  const { meta, content } = getMeta(lines);
  
  const html = marked.parse(content);
  
  let template = BASE_TEMPLATE
    .replace('{{TITLE}}', meta.title || 'Untitled')
    .replace('{{CONTENT}}', html)
    .replace('{{TYPE}}', type)
    .replace('{{DATE}}', meta.date || '')
    .replace('{{DESC}}', meta.description || '');
  
  // Handle index page links
  if (type === 'translation') {
    template = template.replace('{{BREADCRUMB}}', 
      '<li><a href="/translations" class="hover:text-black">Translations</a></li><li>/</li>');
  } else {
    template = template.replace('{{BREADCRUMB}}', 
      '<li><a href="/blog" class="hover:text-black">Writing</a></li><li>/</li>');
  }
  
  // Ensure directory exists
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(destPath, template);
  console.log(`Built: ${destPath}`);
}

function buildIndex(srcDir, destDir, type) {
  const template = fs.readFileSync(path.join(__dirname, 'src', 'list.html'), 'utf8');
  
  // Get all MD files
  const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
  const posts = [];
  
  for (const file of files) {
    const mdContent = fs.readFileSync(path.join(srcDir, file), 'utf8');
    const { meta } = getMeta(mdContent.split('\n'));
    
    const slug = file.replace('.md', '');
    posts.push({
      title: meta.title || slug,
      date: meta.date || '',
      desc: meta.description || '',
      slug: slug
    });
  }
  
  // Sort by date
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let listHtml = posts.map(p => `
    <article class="blueprint-card p-6 hover:border-slate-400 transition-colors">
      <div class="flex items-start justify-between gap-4">
        <div class="flex-1">
          <span class="text-xs mono text-slate-400">${p.date}</span>
          <a href="./${p.slug}/">
            <h3 class="text-xl font-semibold mt-2 hover:underline">${p.title}</h3>
          </a>
          <p class="text-sm text-slate-500 mt-2">${p.desc}</p>
        </div>
      </div>
    </article>
  `).join('\n');
  
  const typeLabel = type === 'translation' ? 'Translation' : 'Writing';
  const indexHtml = template
    .replace('{{TITLE}}', type === 'translation' ? '翻译文章' : '技术文章')
    .replace('{{DESC}}', type === 'translation' ? '英文技术博客与论文的中文翻译' : '关于编程、架构、工程的个人笔记')
    .replace('{{POSTS}}', listHtml)
    .replace('{{ACTIVE}}', type);
  
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(destDir, 'index.html'), indexHtml);
  console.log(`Built index: ${destDir}/index.html`);
}

// Build home page
function buildHome() {
  const template = fs.readFileSync(path.join(__dirname, 'src', 'home.html'), 'utf8');
  const homeDir = '.';
  
  // Count posts
  const counts = { blog: 0, translations: 0 };
  
  for (const dir of CONTENT_DIRS) {
    if (fs.existsSync(dir.src)) {
      const files = fs.readdirSync(dir.src).filter(f => f.endsWith('.md'));
      counts[dir.dest] = files.length;
    }
  }
  
  let homeHtml = template.replace('{{BLOG_COUNT}}', String(counts.blog))
    .replace('{{TRANS_COUNT}}', String(counts.translations));
  
  fs.writeFileSync(path.join(homeDir, 'index.html'), homeHtml);
  console.log('Built: index.html');
}

// Run build
console.log('Building blog...');

// Build home
buildHome();

// Build each content type
for (const { src, dest } of CONTENT_DIRS) {
  if (!fs.existsSync(src)) {
    console.log(`Skip: ${src} not found`);
    continue;
  }
  
  // Build index
  buildIndex(src, dest, dest === 'translations' ? 'translation' : 'writing');
  
  // Build each post
  const files = fs.readdirSync(src).filter(f => f.endsWith('.md'));
  for (const file of files) {
    const slug = file.replace('.md', '');
    buildPost(
      path.join(src, file),
      path.join(dest, slug, 'index.html'),
      dest === 'translations' ? 'translation' : 'writing'
    );
  }
}

console.log('Done!');