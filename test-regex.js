const s = `{\n  "verdict": "HOLD",\n  "reasoning": "Line 1\nLine 2"\n}`;
const regex = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
console.log(s.replace(regex, m => m.replace(/\n/g, "\\n")));
