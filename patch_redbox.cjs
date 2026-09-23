const fs = require('fs');
const path = 'src/Components/GenerateInvoiceModal.jsx';
let content = fs.readFileSync(path, 'utf8');

const searchStr = `<div style={{display:'none'}} className="text-[8px] text-red-500 w-12 break-all overflow-hidden max-h-12 border border-red-200 p-0.5 rounded" title={imgSrc}>{imgSrc}</div>`;
const replaceStr = `<div style={{display:'none'}} className="absolute left-14 top-2 text-[10px] text-white bg-black/80 px-2 py-1 rounded whitespace-nowrap z-50 shadow-lg pointer-events-none">{imgSrc}</div>`;

if (content.includes(searchStr)) {
    content = content.replace(searchStr, replaceStr);
    fs.writeFileSync(path, content);
    console.log("Fixed red box display");
} else {
    console.log("Could not find search string");
}
