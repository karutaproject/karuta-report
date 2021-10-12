
const fs = require('fs');
const puppeteer = require('puppeteer');

const repFolder = "./reports/";
const server = "https://www.eportfolium.fr";
const app = "/univ-smb";
const url = server+app+"/application/htm/login.htm";

const portid = process.argv[2];
const dashid = process.argv[3];
const substi = process.argv[4];

const urlreport = server+app+"/report_bootstrap.html?uuid="+portid+"&dashid="+dashid;
const reportFile = repFolder+substi+"__"+dashid

login = "root";
password = "Adminsmb!";

async function run () {
	const browser = await puppeteer.launch();
	const context = await browser.createIncognitoBrowserContext();
	const page = await context.newPage();
	await page.goto(url);
	await page.type('#useridentifier', login+"#"+substi);
	await page.type('#password', password);
	await page.screenshot({path: 'screenshot.png'});
	await page.evaluate(() => callSubmit('','fr') );
	//  await page.click('button[class~=button-login]')
	await page.waitForNavigation()
	await page.screenshot({ path: 'main.png' });
	await page.goto(urlreport);
//	await page.waitForNavigation({waitUntil: 'networkidle0',});
	await page.waitForTimeout(10000);
	await page.screenshot({ path: reportFile+'.png' });

	const report = await page.$eval('#contenu', page => page.innerHTML);
	fs.writeFileSync(reportFile+'.html', report);

	context.close();
	browser.close();
}
run();

