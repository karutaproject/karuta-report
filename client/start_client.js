
var drawConfig = function()
{
	// Load in-memory config
	$.ajax('/config',{
		type: 'GET',
		success: function(data, status, xhr)
		{
			var table = $('#conf_table',document);
			$(table).empty();
			$(table).append('<tr><th>Portfolio</th><th>Code</th><th>Start day</th><th>Start Time</th><th>Occurence</th><th>Action</th><th>Last ran</th></tr>');
			var lines = $('line', data);
			for( var i=0; i<lines.length; ++i )
			{
				var line = lines[i];
				var portid = $('>portfolioid', line).text();
				var code = $('>code', line).text();
				var startday = $('>startday', line).text();
				var time = $('>time', line).text();
				var freq = $('>freq', line).text();
				var last = $('>last', line).text();
				var tr = $('<tr></tr>');
				$(tr).append('<td>'+portid+'</td>');
				$(tr).append('<td>'+code+'</td>');
				$(tr).append('<td>'+startday+'</td>');
				$(tr).append('<td>'+time+'</td>');
				$(tr).append('<td>'+freq+'</td>');
				var buttonDel = $('<button>Del</button>');
				$(buttonDel).data('id',code);
				$(buttonDel).click(function()
				{
					$.ajax('/config/'+$(this).data('id'),{
						type: 'DELETE',
						success: function(data, status, xhr){
							drawConfig();
						}
					});
				});
				var td = $('<td></td>');
				$(td).append(buttonDel);
				$(tr).append(td);
				$(tr).append('<td>'+last+'</td>');
				$(table).append(tr);
			}	// End looping all lines
		},
	});
};

$(document).ready(function()
{
	// Parse and display
	drawConfig();
});
