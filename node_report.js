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

/// command execution related

var http = require('http');
var util = require('util');
var req = require('request');
var url = require('url');
var exec = require('child_process').exec;

var appliname = "karuta";
var currentCode = "";

/// Basic queue code
var Queue = function()
{
	// Actual usable size will have -1
	// Minimum should be 2
	this.MAXQUEUE=8;
	this.q = new Array(this.MAXQUEUE);
	this.head = 0;
	this.tail = 0;
};

Queue.prototype.size = function()
{
	if( this.tail >= tail.head )
		return this.tail-this.head;
	else
		return this.tail + this.MAXQUEUE-this.head;
};

// Fetch value without dequeueing
Queue.prototype.get = function()
{
	if( this.tail != this.head )
		return this.q[this.head];
	return null;
}

Queue.prototype.queue = function( value )
{
	// Check if there's space to add
	if( this.tail >= this.head )
	{
		this.q[this.tail] = value;
		// Check if we haven't reached the end
		if( this.tail < this.MAXQUEUE-1 )
			this.tail += 1;
		else	// Reached end, loop back
			this.tail = 0;
	}
	else	// Check if we aren't catching up with head
	{
		if( this.tail+1 == this.head )
			// Can't add since we won't know if empty or not (or add a flag)
			return false;
		else
			this.q[this.tail] = value;
		this.tail += 1;
	}
	return true;
};

Queue.prototype.dequeue = function()
{
	if( this.tail == this.head )	// Empty
		return null;

	var d = this.q[this.head];
	if( this.head +1 < this.MAXQUEUE )
		this.head += 1;
	else
		this.head = 0;
	return d;
};

// List of code that needs to be processed
// Will always be empty or ==1, unless there's some really long running job
var isactive = false;
var jobqueue = new Queue();

// Ensure we run only 1 job at a time.
// Limitation due to how the code called is written and nodejs memory management
var executeTopJob = function()
{
	if( !isactive )
	{
		// Get and remove first job
		j = jobqueue.get();
		// If we ask to process something and nothing remains,
		if( j != null )
		{
			// Set active state
			isactive = true;

			// Execute command
      var cmd = "casperjs --ignore-ssl-errors=yes --portid='"+j[0]+"' --dashid='"+j[1]+"' --user='"+j[2]+"' casperrun.js";
      exec(cmd, function(error, stdout, stderr){
        // And now we wait till command returns from it
        jobFinished();
      });
		}
	}
};

var jobFinished = function()
{
	var d = new Date();
	console.log('JOB FINISHED AT: '+d);
	var fs = require('fs');
	var code = jobqueue.dequeue();
	isactive = false;
	executeTopJob();
};


var processReport = function( portid, code, user )
{
	// Add a job on the queue
	jobqueue.queue([portid, code, user]);
	// Ask to process everything;
	executeTopJob();
};

/// Receive configuration info to write somehere
/// Daemon runs and execute task
/// Write result in a file
/// Send pre-processed data when asked

module.exports =
{
	processReport: processReport,
};

