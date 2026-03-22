const https = require('https');
const fs = require('fs');
const path = require('path');

const weapons = [
  "strategic-sword", "nameless-sword", "stormbreaker-spear", 
  "heavenquaker-spear", "nameless-spear", "infernal-twinblades", 
  "mo-dao", "panacea-fan", "inkwell-fan", "soulshade-umbrella", 
  "vernal-umbrella", "everspring-umbrella", "mortal-rope-dart", 
  "unfettered-rope-dart", "thundercry-blade"
];

const dir = path.join(__dirname, '..', 'assets', 'weapons');

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

console.log('Starting weapon icon downloads...');

let completed = 0;

weapons.forEach(weapon => {
    const url = `https://wherewindsmeet.wiki.fextralife.com/file/Where-Winds-Meet/${weapon}-weapon-icon-where-winds-meet-wiki-guide.png`;
    const dest = path.join(dir, `${weapon}.png`);

    https.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
    }, (res) => {
        if (res.statusCode === 200) {
            const file = fs.createWriteStream(dest);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                console.log(`✅ Downloaded: ${weapon}.png`);
                checkDone();
            });
        } else {
            console.log(`❌ Not found on wiki (${res.statusCode}): ${weapon}`);
            // Small cleanup for 404 redirects or empty frames if they happen
            res.resume();
            checkDone();
        }
    }).on('error', (err) => {
        console.log(`❌ Error descending ${weapon}: ${err.message}`);
        checkDone();
    });
});

function checkDone() {
    completed++;
    if (completed === weapons.length) {
        console.log('\nFinished all download tasks!');
        console.log(`Check the "assets/weapons" folder for the downloaded icons.`);
    }
}
