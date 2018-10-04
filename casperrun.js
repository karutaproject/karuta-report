/* =======================================================
   Copyright 2017 - ePortfolium - Licensed under the
   Educational Community License, Version 2.0 (the "License"); you may
   not use this file except in compliance with the License. You may
   obtain a copy of the License at

   http://www.osedu.org/licenses/ECL-2.0

   Unless required by applicable law or agreed to in writing,
   software distributed under the License is distributed on an "AS IS"
   BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
   or implied. See the License for the specific language governing
   permissions and limitations under the License.
   ======================================================= */

// --ignore-ssl-errors=yes --portid='f7731184-2483-4640-b87d-67d0df9a255b' --dashid='fa2441ec-b1ab-11e6-93ef-00215e6c3f32

var karutaserver = 'https://localhost/';
var karutaservice = 'karuta/'
var reportserver = 'http://localhost:8081/'
var user = "USER";
var pass = "PASS";

var page = require('casper').create({verbose:true,});
var portid = page.cli.get('portid');
var dashid = page.cli.get('dashid');
var fs = require('fs');

var baseurl = karutaserver+karutaservice+"application/htm/karuta.htm?lang=fr"
console.log("Opening page: "+baseurl);

page.start(baseurl);

// Login
page.then(function(casp, status){
  page.capture("casper-main.png");
  console.log("Page opened with status: "+status);
  this.sendKeys('input[id="useridentifier"]', user);
  this.sendKeys('input[id="password"]', pass);
  this.click('button[class="button-login"]');
  this.wait(5000, function() {
      console.log("Logged in");
      page.capture("casper.png");
      });
});

// Fetch all dashboard in this portfolio
var porturl = karutaserver+'/report_bootstrap.html?uuid='+portid;

// Pre-process all those dashboard
var urlreport = porturl+'&dashid='+dashid;
page.thenOpen(urlreport, function(status){
  console.log("Dashboard list opened: "+porturl+'&dashid='+dashid);
  this.wait(5000, function() {
	console.log("Saving dashboard: "+dashid);
	var output = '<div id="contenu">'+this.getHTML("div#contenu")+'</div>';
	page.capture('reports/'+dashid+'.png');
	fs.write('reports/'+dashid+'.html', output, 'w');
  });
});

page.run();

