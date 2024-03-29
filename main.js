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
var configuration = [];
var userconfig = {};	// user -> code -> conf line

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
var startCycle = function( user, code )
{
	var cid = userconfig[user][code];
	var line = configuration[cid];
	// Clear any previous timer
	if( line['timer'] != null )
		clearTimeout(line['timer']);
	// Actual timer with the right frequency
	var date = new Date();
	// Start it once for the first time
	line.lastRan = date;
	report_lib.processReport(line['portfolioid'], code, line["user"]);
	// The rest is done via timer
	var timer = setInterval(function()
	{
		console.log('STARTING REPORT: '+code+' @ '+line['portfolioid']+' for '+line['user']);
		report_lib.processReport(line['portfolioid'], code, line['user']);
	}, line['freq']);
	line['timer'] = timer;
	console.log('ACTUAL START AT: '+date+" CODE: "+code+" @ "+line['portfolioid']+"["+line['user']+"]");
};

/// Timer call this function
var startDelay = function( delay, user, code )
{
	var cid = userconfig[user][code];
	var line = configuration[cid];
	// Clear any previous timer
	if( line['timer'] != null )
		clearTimeout(line['timer']);
	var f = function(){ startCycle(user, code) }
	var timer = setTimeout(f, delay);
	line['timer'] = timer;	// For the temporary timer
	console.log('USER: '+user+' DELAY: "'+delay+" CODE:"+ code+" @ "+line['portfolioid'] +"["+line+"]");
};

var addConfLine = function(portid, code, startday, time, freqRead, user, last)
{
	if('' == code || portid == '' || user == '') return;
	console.log("Added: "+portid+'/'+code+" start at: "+time+" each "+freqRead+" for user "+user);
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
		code: code,
		startday: startday,
		time: time,
		freq: freq,
		freqRead: freqRead,
		timer: null,
		job: null,
		lastRan: last,
		user: user
	};
	var cursize = configuration.length;
	console.log("Configuration at "+cursize);
	if( userconfig[user] == null )
		userconfig[user] = {};
	userconfig[user][code] = cursize;
	configuration[cursize] = output;
	return output;
};

var saveConfiguration = function()
{
	var fs = require('fs');
	var source = fs.createWriteStream(confFile);
	console.log("Writing configuration lines");
	for( var u in userconfig )
	{
		for( var c in userconfig[u] )
		{
			var cid = userconfig[u][c];
			var line = configuration[cid];
			var portfolioid = line['portfolioid'];
			var startday = line['startday'];
			var time = line['time'];
			var freq = line['freqRead'];
			var last = line['lastRan'];
			/// Write in conf file
			source.write(u+';'+c+';'+portfolioid+';'+startday+';'+time+';'+freq+';'+last+'\n');
		}
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
	console.log("Loading configuration lines: "+datasplit.length);
	// Load
	for( var i=0; i<datasplit.length; ++i )
	{
		console.log("Processing line: "+i);
		var col = datasplit[i].split(';');
		var user = col[0];
		var code = col[1];
		var portid = col[2];
		var startday = col[3];
		var starttime = col[4];
		var freq = col[5];
		var last = col[6];
		addConfLine(portid, code, startday, starttime, freq, user, last);
	}
	// Evaluate work
	daemon();
};

// Daemon where configuration is evaluated every X hours
// Call this after adding a configuration
var daemon = function()
{
	console.log("Creating timers");
	// For each code without timer
	for( var cid in configuration )
	{
		console.log("Line"+cid);
		var line = configuration[cid];
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

			var freq = 0;
			switch(line['freqRead'])
			{
				case 'day':
					freq = DAY;
					daynum = 0;
					break;
				case 'week':
					freq = WEEK;
					break;
				case 'month':
					freq = MONTH;
					break;
			}
			// Diff start time with current time
			var code = line['code'];
			var user = line['user'];
			var t = line['time'];	// HH:mm
			var tsplit = t.split(':');
			var th = tsplit[0];
			var tm = tsplit[1];
			// Eval configuration dates, start timers
			var delay = daynum * DAY + (th - d.getHours()) * HOUR + (tm - d.getMinutes()) * MINUTE + (0 - d.getSeconds()) * SECOND;
			if( delay < 0 )
				delay = delay + freq;
			startDelay(delay, user, code);
		}
		else
		{
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
				data += '<code>'+line.code+'</code>';
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

		case 'PUT':	// Change configuration line
			response.write('PUT /config');
			break;

		case 'POST':	// New configuration line
			console.log("PROCESS BODY:");
			var body = '';
			request.on('data', function(chunk){
				body += chunk;
				if( body.length > 1e6 ) request.connection.destroy();
				});
			request.on('end', function(){
				// Parse info sent
				var qs = require('querystring');
				var data = qs.parse(body);
				console.log("data: "+util.inspect(data,false, null));
				var c = configuration[data.code];
				if( c != null )
					clearInterval(c.timer);
				//				addConfLine(data.portfolioid, data.code, data.startday, data.time, data.freq, data.user);
				addConfLine(data.portfolioid, data.code, data.startday, data.time, data.freq, 1);
				/// Save configuration file
				saveConfiguration();
				daemon();

				/// Force first run
				report_lib.processReport(data.portfolioid, data.code, data.user);

				var header = {};
				header["Access-Control-Allow-Origin"] = "*";
				header["Content-Type"] = "text/plain";
				response.writeHead(200, "OK", header);
			});
			/*
			response.writeHead(200, {
			});
			//*/
			/*
			response.writeHead(302, {
				'Location': '/client/config.html'
			});
			//*/
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
			configuration[code] = null;
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
//			var filename = '.'+request.url.replace("report", "reports");
			var filename = './reports'+request.url;
			console.log('Fetching report: '+filename);
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
				var header = {};
				header["Content-Type"] = "text/plain";
				response.writeHead(404, "404 Not found", header);
			}

			break;

		case 'POST':    // New configuration line
                        console.log("PROCESS BODY:");
                        var body = '';
                        request.on('data', function(chunk){
                                body += chunk;
                                if( body.length > 1e6 ) request.connection.destroy();
                                });
                        request.on('end', function(){
                                // Parse info sent
                                var qs = require('querystring');
                                var data = qs.parse(body);
                                console.log("data: "+util.inspect(data,false, null));
                                var c = configuration[data.code];
                                if( c != null )
                                        clearInterval(c.timer);
                                addConfLine(data.portfolioid, data.code, data.startday, data.time, data.freq, data.user);
                                /// Save configuration file
                                saveConfiguration();
                                daemon();

                                /// Force first run
                                report_lib.processReport(data.portfolioid, data.code, data.user);

                                var header = {};
                                header["Access-Control-Allow-Origin"] = "*";
                                header["Content-Type"] = "text/plain";
                                response.writeHead(200, "OK", header);
                        });
                        /*
                        response.writeHead(200, {
                        });
                        //*/
                        /*
                        response.writeHead(302, {
                                'Location': '/client/config.html'
                        });
                        //*/
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
//		console.log(request.headers);
		report_request(request, response);
		/*
		var parsedurl = url.parse(request.url);

		console.log(parsedurl.pathname+" "+parsedurl.pathname.indexOf('/report', 0));
		// Obviously, configuring the daemon
		if( parsedurl.pathname.indexOf("/config", 0) == 0 )
		{
			config(request, response);
		}
		// Asking for the pre-processed report
		else if( parsedurl.pathname.indexOf('/report', 0) == 0 )
		{
			report_request(request, response);
		}
		//else if( '/karuta-backend' == parsedurl.pathname )
		//	proxyurl(request, response)
		else if( parsedurl.pathname.indexOf('/client/', 0) == 0 )
		{
			file.serve(request, response);
		}
		else
			response.end();
		//*/
	}
};

// Load configuration
loadConfiguration();
console.log('Configuration parsed');


http.createServer(main).listen(8081, '127.0.0.1');
console.log('Server running at http://127.0.0.1:8081/');

