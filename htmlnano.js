const htmlnano = require('htmlnano');
const fs = require('fs').promises;
const path = require('path');

async function minifyHtml() {
    const publicDir = path.join(__dirname, 'public');
    const files = await fs.readdir(publicDir);

    for (const file of files) {
        if (file.endsWith('.html')) {
            const filePath = path.join(publicDir, file);
            const content = await fs.readFile(filePath, 'utf8');
            const result = await htmlnano.process(content);
            await fs.writeFile(filePath, result.html);
        }
    }
}

minifyHtml().catch(err => {
    console.error('Error minifying HTML files:', err);
    process.exit(1);
});