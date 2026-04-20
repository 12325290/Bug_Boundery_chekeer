// Utility function
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag])
    );
}

// === DOM Elements ===
const codeEditor = document.getElementById('codeEditor');
const lineNumbers = document.getElementById('lineNumbers');
const themeToggle = document.getElementById('themeToggle');
const languageSelect = document.getElementById('languageSelect');
const analyzeBtn = document.getElementById('analyzeBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const clearBtn = document.getElementById('clearBtn');
const copyBtn = document.getElementById('copyBtn');
const outputContainer = document.getElementById('outputContainer');
const previewToggle = document.getElementById('previewToggle');
const previewContainer = document.getElementById('previewContainer');
const livePreview = document.getElementById('livePreview');

// === State ===
let isLivePreviewMode = false;
let currentLanguage = 'javascript';

// === Sample Data ===
const samples = {
    javascript: `// A simple JavaScript function
function calculateTotal(price, tax) {
    let total = price + tax
    return total
}

// Unclosed bracket here
if (true) {
    console.log("Missing closing brace");

// Using undefined variable
let result = myUndefinedVariable + 10;`,
    html: `<!DOCTYPE html>
<html>
<head>
    <title>Sample Site</title>
</head>
<body>
    <h1>Welcome to CodeMedic
    <p>This paragraph is properly closed</p>
    <div>
        <span>Unclosed div and span with unformatted brackets < >
    </div>
</body>
</html>`,
    css: `body {
    background-color: #f0f0f0;
    margin: 0
    padding: 0;
}

.container {
    width: 100%;
    /* Missing closing bracket here
`
};

// === Initialization ===
document.addEventListener('DOMContentLoaded', () => {
    // Load saved code from local storage
    const savedCode = localStorage.getItem('codemedic_code');
    const savedLang = localStorage.getItem('codemedic_lang');
    
    if (savedLang) {
        languageSelect.value = savedLang;
        currentLanguage = savedLang;
    }
    
    if (savedCode) {
        codeEditor.value = savedCode;
    } else {
        codeEditor.value = samples[currentLanguage];
    }
    
    updateLineNumbers();
    updateLivePreviewVisibility();
    
    // Check system preference for theme, or local storage
    const savedTheme = localStorage.getItem('codemedic_theme');
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
});

// === Event Listeners ===

// Synchronize line numbers scrolling with editor
codeEditor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = codeEditor.scrollTop;
});

// Update line numbers and local storage on input
codeEditor.addEventListener('input', () => {
    updateLineNumbers();
    saveToLocalStorage();
    if (isLivePreviewMode && currentLanguage === 'html') {
        updateLivePreview();
    }
});

// Handle tab key to insert spaces
codeEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        
        // Insert 4 spaces
        codeEditor.value = codeEditor.value.substring(0, start) + "    " + codeEditor.value.substring(end);
        
        // Move cursor
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
        updateLineNumbers();
    }
});

// Theme Toggle
themeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    
    if (isDark) {
        themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
        localStorage.setItem('codemedic_theme', 'dark');
    } else {
        themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
        localStorage.setItem('codemedic_theme', 'light');
    }
});

// Language Select
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    saveToLocalStorage();
    updateLivePreviewVisibility();
});

// Buttons
loadSampleBtn.addEventListener('click', () => {
    codeEditor.value = samples[currentLanguage];
    updateLineNumbers();
    saveToLocalStorage();
    outputContainer.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-laptop-code empty-icon"></i>
            <p>Example loaded. Click "Analyze Code" to see results.</p>
        </div>
    `;
});

clearBtn.addEventListener('click', () => {
    codeEditor.value = '';
    updateLineNumbers();
    saveToLocalStorage();
    outputContainer.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-laptop-code empty-icon"></i>
            <p>Editor cleared. Enter code to analyze.</p>
        </div>
    `;
});

copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(codeEditor.value).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    });
});

analyzeBtn.addEventListener('click', analyzeCode);

previewToggle.addEventListener('click', () => {
    isLivePreviewMode = !isLivePreviewMode;
    if (isLivePreviewMode) {
        previewToggle.classList.replace('btn-secondary', 'btn-primary');
        previewToggle.innerHTML = '<i class="fa-solid fa-eye-slash"></i> Analysis Output';
        outputContainer.style.display = 'none';
        previewContainer.style.display = 'flex';
        updateLivePreview();
    } else {
        previewToggle.classList.replace('btn-primary', 'btn-secondary');
        previewToggle.innerHTML = '<i class="fa-solid fa-eye"></i> Live Preview Mode';
        outputContainer.style.display = 'flex';
        previewContainer.style.display = 'none';
    }
});

// === Functions ===

function updateLineNumbers() {
    const lines = codeEditor.value.split('\n').length;
    let numbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        numbersHtml += `<span id="line-${i}">${i}</span><br>`;
    }
    lineNumbers.innerHTML = numbersHtml || '1';
}

function highlightErrorLines(errorLines) {
    const lines = codeEditor.value.split('\n').length;
    let numbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        if (errorLines.includes(i)) {
            numbersHtml += `<span id="line-${i}" class="line-number-error">${i}</span><br>`;
        } else {
            numbersHtml += `<span id="line-${i}">${i}</span><br>`;
        }
    }
    lineNumbers.innerHTML = numbersHtml || '1';
}

function saveToLocalStorage() {
    localStorage.setItem('codemedic_code', codeEditor.value);
    localStorage.setItem('codemedic_lang', currentLanguage);
}

function updateLivePreviewVisibility() {
    if (currentLanguage === 'html') {
        previewToggle.style.display = 'flex';
    } else {
        previewToggle.style.display = 'none';
        if (isLivePreviewMode) {
            // Revert back to analysis output
            isLivePreviewMode = false;
            previewToggle.classList.replace('btn-primary', 'btn-secondary');
            previewToggle.innerHTML = '<i class="fa-solid fa-eye"></i> Live Preview Mode';
            outputContainer.style.display = 'flex';
            previewContainer.style.display = 'none';
        }
    }
}

function updateLivePreview() {
    if (!livePreview) return;
    const code = codeEditor.value;
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    livePreview.onload = () => {
        URL.revokeObjectURL(url);
    };
    livePreview.src = url;
}

// === Analysis Engine ===

function analyzeCode() {
    if (isLivePreviewMode) {
        // Switch to output tab automatically
        previewToggle.click();
    }
    
    const code = codeEditor.value;
    if (!code.trim()) {
        outputContainer.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-triangle-exclamation empty-icon" style="color: var(--error-border);"></i>
                <p>Please enter some code to analyze.</p>
            </div>
        `;
        return;
    }

    // Reset line numbers highlighting
    updateLineNumbers();
    
    // Show loading briefly for effect
    const originalBtnHTML = analyzeBtn.innerHTML;
    analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
    analyzeBtn.disabled = true;

    setTimeout(() => {
        analyzeBtn.innerHTML = originalBtnHTML;
        analyzeBtn.disabled = false;
        
        let errors = [];
        
        if (currentLanguage === 'javascript') {
            errors = analyzeJS(code);
        } else if (currentLanguage === 'html') {
            errors = analyzeHTML(code);
        } else if (currentLanguage === 'css') {
            errors = analyzeCSS(code);
        }

        renderErrors(errors);
        
    }, 500); // Artificial delay to make it feel like "Analysis"
}

// Simple rule-based code analyzers
function analyzeJS(code) {
    const errors = [];
    const lines = code.split('\n');
    let openBraces = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();
        
        // Skip comments and empty lines
        if (trimmed.startsWith('//') || trimmed === '') continue;
        
        // 1. Missing Semicolons
        if ((trimmed.startsWith('let ') || trimmed.startsWith('const ') || trimmed.startsWith('var ') || trimmed.startsWith('return ')) && 
            !trimmed.endsWith(';') && !trimmed.endsWith('{')) {
            errors.push({
                type: 'Syntax Error (Formatting)',
                line: lineNum,
                codeFragment: trimmed,
                message: 'Missing Semicolon (;)',
                explanation: 'A semicolon is used to terminate a statement in JavaScript. While JS does have Automatic Semicolon Insertion (ASI), it is best practice to end statements explicitly to avoid unexpected bugs.',
                fix: 'Add a semicolon at the end: <code>' + escapeHTML(trimmed) + ';</code>'
            });
        }
        
        // 2. Unclosed brackets tracking
        openBraces += (line.match(/\{/g) || []).length;
        openBraces -= (line.match(/\}/g) || []).length;
        
        // 3. Undefined variables (dummy check)
        if (trimmed.includes('myUndefinedVariable')) {
             errors.push({
                type: 'Reference Error',
                line: lineNum,
                codeFragment: trimmed,
                message: 'Undefined Variable Used',
                explanation: 'You are trying to use a variable that has not been declared yet. Variables must be declared using let, const, or var before they can be used.',
                fix: 'Declare the variable earlier: <code>let myUndefinedVariable = 0;</code>'
            });
        }
    }
    
    // If braces don't match at the end
    if (openBraces > 0) {
        errors.push({
            type: 'Syntax Error',
            line: lines.length,
            codeFragment: 'End of file',
            message: 'Unclosed Braces {}',
            explanation: `There are ${openBraces} unclosed curly brace(s) in your code. Blocks like functions, loops, and objects require closing braces to properly encapsulate their code.`,
            fix: 'Add a closing brace <code>}</code> at the end of the unclosed block.'
        });
    }

    return errors;
}

function analyzeHTML(code) {
    const errors = [];
    const lines = code.split('\n');
    const selfClosingTags = ['br', 'img', 'input', 'hr', 'meta', 'link'];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();
        
        const openTags = [...line.matchAll(/<([a-zA-Z0-9]+)(?:\s+[^>]+)?(?<!\/)>/g)];
        const closeTags = [...line.matchAll(/<\/([a-zA-Z0-9]+)>/g)];
        
        if (openTags.length > 0 && closeTags.length === 0) {
            openTags.forEach(match => {
                const tag = match[1].toLowerCase();
                if (!selfClosingTags.includes(tag)) {
                    if (['h1','h2','h3','h4','h5','h6'].includes(tag)) {
                        errors.push({
                            type: 'Syntax Error',
                            line: lineNum,
                            codeFragment: trimmed,
                            message: `Unclosed <${escapeHTML(tag)}> tag`,
                            explanation: `HTML tags usually require a closing tag to tell the browser where the element ends.`,
                            fix: `Add <code>&lt;/${escapeHTML(tag)}&gt;</code> at the end of your content.`
                        });
                    }
                }
            });
        }
        
        if (line.includes('< ') || line.includes(' >')) {
             errors.push({
                type: 'Formatting Error',
                line: lineNum,
                codeFragment: trimmed,
                message: `Malformed tag brackets`,
                explanation: `HTML tags must be perfectly formed, like <code>&lt;div&gt;</code> without extra spaces around the angle brackets.`,
                fix: `Remove the extra spaces inside the brackets.`
            });
        }
    }
    
    return errors;
}

function analyzeCSS(code) {
    const errors = [];
    const lines = code.split('\n');
    let openBraces = 0;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineNum = i + 1;
        const trimmed = line.trim();
        
        if (trimmed.startsWith('/*') || trimmed === '') continue;
        
        openBraces += (line.match(/\{/g) || []).length;
        openBraces -= (line.match(/\}/g) || []).length;
        
        if (trimmed.includes(':') && !trimmed.endsWith(';') && !trimmed.endsWith('{') && openBraces > 0) {
             errors.push({
                type: 'Syntax Error',
                line: lineNum,
                codeFragment: trimmed,
                message: 'Missing Semicolon (;)',
                explanation: 'In CSS, property-value pairs must be separated by semicolons. Without it, the browser cannot distinguish between different rules.',
                fix: 'Add a semicolon: <code>' + escapeHTML(trimmed) + ';</code>'
            });
        }
    }
    
    if (openBraces > 0) {
        errors.push({
            type: 'Syntax Error',
            line: lines.length,
            codeFragment: 'End of file',
            message: 'Unclosed CSS Rule Block',
            explanation: `There are ${openBraces} unclosed curly brace(s) in your CSS blocks. Without a closing brace, rules bleed into one another.`,
            fix: 'Add a closing brace <code>}</code> at the end of your CSS rule.'
        });
    }

    return errors;
}

function renderErrors(errors) {
    outputContainer.innerHTML = '';
    
    if (errors.length === 0) {
        outputContainer.innerHTML = `
            <div class="success-card">
                <i class="fa-solid fa-circle-check success-icon"></i>
                <h2>Code looks great!</h2>
                <p>No common errors were detected in your code.</p>
            </div>
        `;
        return;
    }
    
    const errorLines = errors.map(e => e.line);
    highlightErrorLines(errorLines);
    
    const countTitle = document.createElement('h3');
    countTitle.style.marginBottom = '12px';
    countTitle.textContent = \`Found \${errors.length} issue(s):\`;
    outputContainer.appendChild(countTitle);
    
    errors.forEach(err => {
        const card = document.createElement('div');
        card.className = 'error-card';
        
        card.innerHTML = `
            <h3>
                <i class="fa-solid fa-circle-exclamation"></i>
                \${err.message}
                <span class="error-badge">Line \${err.line}</span>
            </h3>
            <div class="error-line">\${escapeHTML(err.codeFragment)}</div>
            <p class="error-explanation"><strong>Explanation:</strong> \${err.explanation}</p>
            <div class="error-fix">
                <strong>Suggested Fix:</strong>
                \${err.fix}
            </div>
        `;
        
        outputContainer.appendChild(card);
    });
}
