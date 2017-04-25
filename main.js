/* =======================================================
	 Copyright 2014 - ePortfolium - Licensed under the
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

/// higher level management: scheduling and http requests

var http = require('http');
var static_file = require('node-static');
var file = new(static_file.Server)();
var url = require('url');
var util = require('util');
var req = require('request');

var report_lib = require('./node_report');

var SECOND = 1 * 1000;
var MINUTE = 60 * SECOND;
var HOUR = 60 * MINUTE
var DAY = 24 * HOUR;
var WEEK = 7 * DAY;
var MONTH = 30 * DAY;	// Every month is 30 days

// report code, start time (no date), frequency (daily, weekly, monthly)
var confFile = './conf.csv';
// code -> {time, freq}
var configuration = {};

var proxyurl = function( request, response )
{
	var parsedurl = url.parse(request.url);
	var redirect = parsedurl.query;
	console.log('PROXY TO:'+redirect);
	var proxyres = function(error, resp, body)
	{
		response.writeHead(resp.statusCode, resp.headers);
		response.write(body);
		response.end();
	};

	var c = report_lib.cookie();
	if( c != null )
		request.headers['Cookie'] = c['key']+'='+c['value'];

	var content = '';
	request.on('data', function(data){
		content += data;
	});
	request.on('end', function(){
	req({
		headers: request.headers,
		url: redirect,
		method: request.method,
		body: content},
		proxyres);
	});
};

/// Timer call this function
var startCycle = function( code )
{
	var line = configuration[code];
	// Actual timer with the right frequency
	var date = new Date();
	console.log('ACTUAL START AT: '+date+" CODE: "+code+" @ "+line['portfolioid'])
	// Start it once for the first time
	line.lastRan = date;
	report_lib.processReport(line['portfolioid'], code);
	// The rest is done via timer
	var timer = setInterval(function()
	{
		console.log('STARTING REPORT: '+code+' @ '+line['portfolioid']);
		report_lib.processReport(line['portfolioid'], code);
	}, line['freq']);
	line['timer'] = timer;
};

/// Timer call this function
var startDelay = function( delay, code )
{
	var line = configuration[code];
	console.log('DELAY: '+delay+" CODE:"+ code+" @ "+line['portfolioid']);
	var f = function(){ startCycle(code) }
	var timer = setTimeout(f, delay);
	line['timer'] = timer;	// For the temporary timer
};

var addConfLine = function(portid, code, startday, time, freqRead, last)
{
	if('' == code || portid == '') return;
	console.log("Added: "+portid+'/'+code+" start at: "+time+" each "+freqRead);
	var freq = 'day';
	switch( freqRead )
	{
		case 'day':
			freq = DAY;
		break;
		case 'week':
			freq = WEEK;
		break;
		case 'month':
			freq = MONTH;
		break;
	}
	if(last == undefined)
	  last = null
	var output =
	{
	    portfolioid: portid,
		startday: startday,
		time: time,
		freq: freq,
		freqRead: freqRead,
		timer: null,
		job: null,
		lastRan: last 
	};
	configuration[code] = output;
	return output;
};

var saveConfiguration = function()
{
	var fs = require('fs');
	var source = fs.createWriteStream(confFile);
	for( var code in configuration )
	{
		var line = configuration[code];
		var portfolioid = line['portfolioid'];
		var startday = line['startday'];
		var time = line['time'];
		var freq = line['freqRead'];
		var last = line['lastRan'];
		/// Write in conf file
		source.write(portfolioid+';'+code+';'+startday+';'+time+';'+freq+'\n');
	}
	source.end();
};

var loadConfiguration = function()
{
	var fs = require('fs');
	// Read complete file
	var data = fs.readFileSync(confFile, {encoding: 'utf-8', flag: 'r'});
	// Split that in line
	var datasplit = data.split('\n');
	// Load
	for( var i=0; i<datasplit.length; ++i )
	{
		var col = datasplit[i].split(';');
		var portid = col[0];
		var code = col[1];
		var startday = col[2];
		var starttime = col[3];
		var freq = col[4];
		var last = col[5];
		addConfLine(portid, code, startday, starttime, freq, last);
	}
	// Evaluate work
	daemon();
};

// Daemon where configuration is evaluated every X hours
// Call this after adding a configuration
var daemon = function()
{
	// For each code without timer
	for( var code in configuration )
	{
		if( code == '' ) continue;
		var line = configuration[code];
		// New configuration don't have a timer started
		if( line['timer'] == null )
		{
			var d = new Date();
			// Diff days
			var daynum = 0;
			switch(line['startday'])
			{
				case 'mon': daynum=1; break;
				case 'tue': daynum=2; break;
				case 'wed': daynum=3; break;
				case 'thu': daynum=4; break;
				case 'fri': daynum=5; break;
				case 'sat': daynum=6; break;
			}
			daynum = daynum - d.getDay();
			if( daynum < 0 ) daynum + 7
			// Diff start time with current time
			var t = line['time'];	// HH:mm
			var tsplit = t.split(':');
			var th = tsplit[0];
			var tm = tsplit[1];
			// Eval configuration dates, start timers
			var delay = daynum * DAY + (th - d.getHours()) * HOUR + (tm - d.getMinutes()) * MINUTE + (0 - d.getSeconds()) * SECOND;
			if( delay < 0 )
				delay = delay + 7 * DAY;
			startDelay(delay, code);
		}
	}
};

// Configure the daemon
var config = function( request, response )
{
	var method = request.method;
	/// Modify configuration information
	switch( method )
	{
		case 'GET':	// Configuration list
			// Generate content from configuration
			var data = '<config>';
			for( var code in configuration )
			{
				var line = configuration[code];
				data += '<line>';
				data += '<portfolioid>'+line.portfolioid+'</portfolioid>';
				data += '<code>'+code+'</code>';
				data += '<startday>'+line.startday+'</startday>';
				data += '<time>'+line.time+'</time>';
				data += '<freq>'+line.freqRead+'</freq>';
				data += '<last>'+line.lastRan+'</last>';
				data += '</line>';
			}
			data += '</config>';
			response.setHeader("Access-Control-Allow-Origin", "*");
			response.setHeader('Content-Type', 'application/xml');
			response.write(data);
			break;

		case 'POST':	// New configuration line
			var body = '';
			request.on('data', function(chunk){ body += chunk; });
			request.on('end', function(){
				// Parse info sent
				var qs = require('querystring');
				var data = qs.parse(body);
				var c = configuration[data.code];
				if( c != null )
					clearInterval(c.timer);
				addConfLine(data.portfolioid, data.code, data.startday, data.time, data.freq);
				/// Save configuration file
				saveConfiguration();
				daemon();
			});
			/*
			response.writeHead(200, {
			});
			//*/
			response.setHeader("Access-Control-Allow-Origin", "*");
			response.setHeader('Content-Type', 'text/plain');
			response.write("OK");
			/*
			response.writeHead(302, {
				'Location': '/client/config.html'
			});
			//*/
			break;

		case 'PUT':	// Change configuration line
			response.write('PUT /config');
			break;

		case 'DELETE':	// Delete single line
			// Contain just the code to be removed
			var parsedurl = url.parse(request.url);
			var split = parsedurl.pathname.split('/');
			var code = split[2];
			// Remove timer related
			var c = configuration[code];
			clearInterval(c.timer);
			// Remove configuration
			delete configuration[code];
			// Save changes
			saveConfiguration();
			response.setHeader('Content-Type', 'text/plain');
			response.write("OK");
			break;
	}

	/// Restart daemon
	response.end();
};

// Simply return the pre-processed report
var report_request = function( request, response )
{
	var method = request.method;
	switch( method )
	{
		case 'GET':
			var parsedurl = url.parse(request.url);
			var split = parsedurl.pathname.split('/');
			var fs = require('fs');
			// Read complete file
			var filename = './reports/'+split[2];
			console.log('Fetching report');
			response.setHeader("Access-Control-Allow-Origin", "*");
			if( fs.existsSync(filename) ){
				console.log('Exist');
				var data = fs.readFileSync(filename, {encoding: 'utf-8', flag: 'r'});
				response.setHeader("Content-Type", "text/html");
				response.write(data);
			}
			else
			{
				console.log("Doesn't exist");
			 	response.writeHead(404, {"Content-Type": "text/plain"});
				response.write("404 Not found");
			}

			break;
	}
	response.end();
};

var main = function (request, response)
{
  	if( request.method === 'OPTIONS' )
	{
	  var header = {};
	  header["Access-Control-Allow-Origin"] = "*";
	  header["Access-Control-Allow-Headers"] = 'Access-Control-Allow-Origin, Content-Type, Content-Length, Authorization, Accept, X-Requested-With';
	  header["Access-Control-Allow-Methods"] = "PUT, POST, GET, DELETE, OPTIONS";
	  header["Access-Control-Max-Age"] = '86400';
	  header["Content-Length"] = '0';
	  response.writeHead(204, "No Content", header);
	  response.end();
	}
	else
	{
	  var parsedurl = url.parse(request.url);

	  // Obviously, configuring the daemon
	  if( parsedurl.pathname.startsWith("/config") )
		config(request, response);
	  // Asking for the pre-processed report
	  else if( parsedurl.pathname.startsWith('/report') )
		report_request(request, response);
	  //else if( '/karuta-backend' == parsedurl.pathname )
	//	proxyurl(request, response)
	  else if( parsedurl.pathname.startsWith('/client/') )
		file.serve(request, response);
	  else
		response.end();
	}
};

// Load configuration
loadConfiguration();
console.log('Configuration parsed');


http.createServer(main).listen(8081);
console.log('Server running at http://127.0.0.1:8081/');

