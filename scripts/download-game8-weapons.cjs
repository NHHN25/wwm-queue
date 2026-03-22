const https = require('https');
const fs = require('fs');
const path = require('path');

const LIST_URL = 'https://game8.co/games/Where-Winds-Meet/archives/564704';
const DIR = path.join(__dirname, '..', 'assets', 'weapons');

if (!fs.existsSync(DIR)){
    fs.mkdirSync(DIR, { recursive: true });
}

console.log('Fetching Game8 Weapons List page...');

https.get(LIST_URL, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
    }
}, (res) => {
    let rawHtml = '';
    res.on('data', chunk => rawHtml += chunk);
    res.on('end', () => {
        // Regex to find: <img ... alt="Weapon Name Icon" ... src="URL" ...>
        // Game8 has src="URL" and alt="Name Icon"
        // Sometimes data-src is used. Let's capture data-src or src.
        const imgRegex = /<img([^>]+)>/gi;
        
        let match;
        let foundWeapons = [];

        while ((match = imgRegex.exec(rawHtml)) !== null) {
            const attributes = match[1];
            
            // Extract alt (might have single or double quotes, and might not have "Icon" at the end)
            const altMatch = attributes.match(/alt=['"]([^'"]+)['"]/i);
            // Extract src or data-src
            const srcMatch = attributes.match(/data-src=['"]([^'"]+)['"]/i) || attributes.match(/src=['"]([^'"]+)['"]/i);
            
            if (altMatch && srcMatch) {
                // If the alt is exactly "Nameless Sword", format it to "nameless-sword"
                // But only grab ones that look like weapons, because game8 has many images.
                // Best to filter against our known list of weapon names or check if name has "sword/spear/etc"
                let rawName = altMatch[1].toLowerCase().replace(' icon', '').replace(/\s+/g, '-');
                
                // Ensure it's not a generic UI icon
                if (['sword', 'spear', 'twinblades', 'mo-dao', 'fan', 'umbrella', 'rope-dart', 'blade'].some(w => rawName.includes(w))) {
                    let imgUrl = srcMatch[1];
                    if (imgUrl.includes('game8.co')) {
                        if (!foundWeapons.find(w => w.name === rawName)) {
                            foundWeapons.push({ name: rawName, url: imgUrl });
                        }
                    }
                }
            }
        }

        if (foundWeapons.length === 0) {
            console.log('❌ Could not parse any weapon icons from the page HTML.');
            return;
        }

        console.log(`Found ${foundWeapons.length} weapon icons on Game8! Downloading...`);

        let completed = 0;
        foundWeapons.forEach(w => {
            const dest = path.join(DIR, `${w.name}.png`);
            https.get(w.url, (imgRes) => {
                if (imgRes.statusCode === 200) {
                    const file = fs.createWriteStream(dest);
                    imgRes.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log(`✅ Downloaded Game8 Icon: ${w.name}.png`);
                        checkDone();
                    });
                } else {
                    console.log(`❌ Failed to download ${w.name} (${imgRes.statusCode})`);
                    imgRes.resume();
                    checkDone();
                }
            }).on('error', err => {
                console.log(`❌ Network error for ${w.name}: ${err.message}`);
                checkDone();
            });
        });

        function checkDone() {
            completed++;
            if (completed === foundWeapons.length) {
                console.log('\\nFinished downloading Game8 weapon icons!');
            }
        }
    });
}).on('error', err => {
    console.error(`Failed to fetch Game8 page: ${err.message}`);
});
