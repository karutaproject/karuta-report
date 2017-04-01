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

// --ignore-ssl-errors=yes --portid='f7731184-2483-4640-b87d-67d0df9a255b'

var karutaserver = 'https://localhost/';
var karutaservice = 'karuta/'
var user = "USER";
var pass = "PASS";

var page = require('casper').create({verbose:true,});
var portid = page.cli.get('portid');
var fs = require('fs');

console.log("Opening page: "+portid);

page.start(karutaserver+karutaservice+"application/htm/login.htm?lang=fr");

// Login
page.then(function(casp, status){
  status = "success"
  console.log("Page opened with status: "+status);
  this.sendKeys('input[id="useridentifier"]', user);
  this.sendKeys('input[id="password"]', pass);
  this.click('button[class="button-login"]');
  this.wait(5000, function() {
    console.log("Logged in");
    // page.capture("casper.png");
  });
});

// Fetch all dashboard in this portfolio
var dashids = [];
var porturl = karutaserver+'/report_bootstrap.html?uuid='+portid;
page.thenOpen(porturl, function(){
  console.log("Dashboard list opened: "+porturl);
  this.wait(1000, function(){
    // page.capture("casper2.png");
    dashids = page.evaluate(function(){
      var ids = [];
      var vals = document.querySelectorAll('p');
      for( var i=0; i<vals.length; ++i ) {
        ids.push(vals[i].innerHTML);
      }
      return ids;
    });
    console.log("Dashboards: "+dashids);
  });
});


// Pre-process all those dashboard
page.then(function(){
  page.each(dashids, function(self, link){
    self.thenOpen(porturl+'&dashid='+link, function(id){
      // FIXME: Assume 10 seconds to complete the report
      // Need a specific tag appended at the end of report construction
      this.wait(10000, function() {
        console.log("Saving dashboard: "+link);
        var output = this.getHTML();
        page.capture('reports/'+link+'.png');
        fs.write('reports/'+link+'.html', output, 'w');
      });
    }, link);
  });
});

page.run();

