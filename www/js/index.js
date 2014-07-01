var app = {
	deviceAddress: "AA:BB:CC:DD:EE:FF",  // get your mac address from bluetoothSerial.list
	deviceName: "No Name",
	pouchDBName: "mypouchgeo", // name of the database pouchDB uses locally on device (NOT remote couchDB)
	nmeaPacket: [], // group of nmea sentences, used for buffering	
	timeStored: new Date().getTime(), // track last save to PouchDB (milliseconds) 
	timeInterval: 30 * 1000, // min time between each save to PouchDB (seconds to milliseconds)
	//timeInterval: 30, //seconds
	portOpen: false, // keep track of whether BT is connected
	progressOverlayOn: false, //track when app is in waiting state with progress wheel
	couchConnInProgress: false,
	totalDeviceRecords: 0, // track num of pouch records on device
	//info about last connection to couch
	lastRemoteConnection: {
		success: false,
		datetime: false,
		numRows: 0,
		address: 0,
		dbName: '',
		lastSuccess: {} // in case this attempt failed, remember details of last successful one
	}, 

	// Application Constructor
	initialize: function() {
		this.bindEvents();

	},
	// Bind Event Listeners
	//
	// Bind any events that are required on startup. Common events are:
	// 'load', 'deviceready', 'offline', and 'online'.
	bindEvents: function() {
		document.addEventListener('deviceready', this.onDeviceReady, false);
		connectButton.addEventListener('touchend', app.manageConnection, false);
		scanButton.addEventListener('touchend', app.checkBluetooth, false);
		devices.addEventListener('change', app.selectPort, false);
		couchButton.addEventListener('touchend', app.saveToCouch, false);
		//couchButton.addEventListener('click', app.saveToCouch, false); // 'click' evt for browser debugging
		configButton.addEventListener('touchend', app.setCouchServer, false);
		secondsButton.addEventListener('touchend', app.setBufferInterval, false);
		$(".config_header").click(app.toggleConfigSettings);
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicity call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		// bluetooth
		app.checkBluetooth();

		// DATABASE: new PouchDB instance
		if (!this.pouchDBName){
			this.pouchDBName = 'mypouchdb';
		}
		dBase.init(this.pouchDBName);
		// how many records on the device right now?
		app.getRecordCount(function(num_rows){
			app.totalDeviceRecords = num_rows;
			//app.displayStatus('storage',num_rows + ' Records on device');
			app.displayStatus('num_device_records',num_rows);
		}); 

		// get saved settings, if there are any
		if (localStorage.getItem('couchServerAddr')){
			dBase.remoteServer = localStorage.getItem('couchServerAddr');
			document.getElementById('couchServer').value = localStorage.getItem('couchServerAddr');
		}
		if (localStorage.getItem('couchDbName')){
			dBase.remoteDbName = localStorage.getItem('couchDbName');
			document.getElementById('couchDbName').value = localStorage.getItem('couchDbName');
		}
		if (localStorage.getItem('timeInterval')){
			app.timeInterval = localStorage.getItem('timeInterval');
			document.getElementById('secondsInput').value = localStorage.getItem('timeInterval');
		}
		// any info about the last connection (attempt) to couch?	 
		if (localStorage.getItem('lastRemoteConnection')){
			app.lastRemoteConnection = JSON.parse(localStorage.getItem('lastRemoteConnection'));
		}
		
		// show storage frequency settings
		app.displayStatus('freq_secs',app.timeInterval/1000);

		// display remote storage history
		app.displayLastConnection();
	},
    
	// Check Bluetooth, list ports if enabled:
	checkBluetooth: function() {   
		// if isEnabled returns failure, this function is called:
		var notEnabled = function() {
			app.displayStatus('device',"Bluetooth is not enabled.");
		};
		
		// if isEnabled returns success, this function is called:
		var listPorts = function() {
			// list the available BT ports:
			bluetoothSerial.list(function(results) {
					var devices = document.getElementById('devices');
					// clear the select list first:
					devices.innerHTML = "";
					
					// result is an array of JSON objects. 
					// iterate over it and pull out relevant elements.
					// on iOS, address is called uuid. On Android it's called address:                  
					
					for (var i in results) {
						if (results[i].uuid) {
							app.deviceAddress = results[i].uuid;
						}
						if (results[i].address) {
							app.deviceAddress = results[i].address;
						}
						devices.innerHTML += '<option value="' +
							app.deviceAddress + '">' +
							results[i].name +
							' </option>';  
					}
					
					if (results.length === 0) {
						app.displayStatus('device',"No BT Serial devices found");
					}
					// show the name of the selected port:
					app.selectPort();
				},
					
				// called if something goes wrong with isEnabled:
				function(error) {
					//app.display(JSON.stringify(error));
				}
			);
		};
					
		// check if Bluetooth is on:
		bluetoothSerial.isEnabled(
			listPorts,
			notEnabled
		);
	},
   
	// sets the current device address and name, and displays them:         
	selectPort: function() {
		var devices = document.getElementById('devices');
		// use the first item from the list as your address:
		app.deviceAddress = devices.options[devices.selectedIndex].value;
		app.deviceName = devices.options[devices.selectedIndex].innerHTML;
		app.displayStatus('device',app.deviceAddress + " " + app.deviceName); 
	},
       
 /*
    Connects if not connected, and disconnects if connected:
*/
	manageConnection: function() {
		// connect() will get called only if isConnected() (below)
		// returns failure. In other words, if not connected, then connect:
		var connect = function () {
			// if not connected, do this:
			app.displayStatus('device',"Attempting to connect to " + app.deviceName);
			// attempt to connect:
			bluetoothSerial.connect(
				app.deviceAddress,  // device to connect to
				app.openPort,    // start listening if you succeed
				app.showError    // show the error if you fail
			);
		};
			
		// disconnect() will get called only if isConnected() (below)
		// returns success  In other words, if  connected, then disconnect:
		var disconnect = function () {
			//app.display("Attempting to disconnect");
			app.displayStatus('device',"Attempting to disconnect from " + app.deviceName);
			// if connected, do this:
			bluetoothSerial.disconnect(
				app.closePort,     // stop listening to the port
				app.showError      // show the error if you fail
			);
		};
		
		// here's the real action of the manageConnection function:
		bluetoothSerial.isConnected(disconnect, connect);
	},
/*
    subscribes to a Bluetooth serial listener for newline
    and changes the button:
*/
	openPort: function() {
		// if you get a good Bluetooth serial connection:
		var secs = app.timeInterval / 1000;
		var startTime = moment().format('HH:mm, MMM DD');

		app.displayStatus('device',"Connected to <b>" + app.deviceName + "</b> at " + startTime);
		//app.displayStatus('freq', "Storing to device every " + secs + " seconds");
		app.displayStatus('freq_secs', secs);
		app.displayStatus('db',''); //clear db status message

		app.portOpen = true;
		
		// change the button's name:
		connectButton.innerHTML = "Disconnect";
		// change button color (class)
		$(connectButton).removeClass('btn-success');
		$(connectButton).addClass('btn-danger');
		// set up a listener to listen for newlines
		// and display any new data that's come in since
		// the last newline:
		bluetoothSerial.subscribe('\n', function (data) {
			app.handleNmeaData(data);
		});
	},

/*
    unsubscribes from any Bluetooth serial listener and changes the button:
*/
	closePort: function() {
		// if you get a good Bluetooth serial connection:
		//app.display("Disconnected from: " + app.deviceName);
		app.displayStatus('device',"Disconnected from: " + app.deviceName);
		//app.showStatus("Disconnected from: " + app.deviceName);
		app.portOpen = false;
		// change the button's name:
		connectButton.innerHTML = "Connect";
		// change button color
		$(connectButton).removeClass('btn-danger');
		$(connectButton).addClass('btn-success');
		// unsubscribe from listening:
		bluetoothSerial.unsubscribe(
			function (data) {
				//app.display(data); //returns "OK"
			},
			app.showError
		);
	},
/*
	take the data from serial listener, then parse and store it
*/
	handleNmeaData: function(data){
		var firstField = data.split(',')[0]; // usu. in format $GPXYZ
		if (firstField === '$GPRMC') { //assume RMC is the beginning of a packet
			// Save the stuff from the last packet
			//  ... but only if it has been more than n seconds since the last db store
			//  ... AND only if we're not connecting to couch right now
			//  ... AND if there's something in the packet array to be stored
			if(new Date().getTime() > (app.timeStored + app.timeInterval) && !app.couchConnInProgress && app.nmeaPacket.length > 0){
				// (now setting the new timeStored in the db add() callback, not here)
				app.storeNmeaPacket(app.nmeaPacket);
			} 
			// Begin a new packet 
			app.nmeaPacket = [];
			// clear screen
			app.clearEl('live_nmea');
		} 
		// if you get an NMEA sentence, beginning with $ :
		if (firstField.substring(0,1) === '$') {	
			// save it to the packet array
			// (store just sentence string for now, not object) 
			app.nmeaPacket.push(data); 
			app.displayToEl(data,'live_nmea');
		}
	},
/*
	converts an NMEA sentence into an object for the datastore
*/
	parseNmeaToObj: function(nmeaStr){
		// example sentence string: $GPRMC,180826.9,V,4043.79444,N,07359.60944,W,,,160614,013.0,W,N*19
		// make it an array:
		nmeaArr = nmeaStr.split(",");
		
		// find the type
		typeProp = nmeaArr[0].slice(-3).toLowerCase(); //eg: rmc
		// process the sentence if the type is in the nmeaDecode object
		if(typeProp in app.nmeaDecode){
			nmeaObj = app.nmeaDecode[typeProp](nmeaArr);
		} else {
			nmeaObj = {};
			//add the sentence type as a named field
			nmeaObj.sentenceType = nmeaArr[0];
			// everything else is a numeric field
			for (var i=0; i < nmeaArr.length; i++){
				nmeaObj[i] = nmeaArr[i]; 
			}
		}
		// store the whole sentence, regardless of type
		nmeaObj.nmeaSentence = nmeaStr;		
		return nmeaObj;
	},
/*
	store the array of NMEA sentence objects to Pouch
	@packetArr is an array of *strings* that get translated to objects
*/	
	storeNmeaPacket: function(packetArr){
		var d = new Date(app.timeStored);
		m = String(d.getMinutes());
		m = (m < 10) ? String('0') + m : m; //zero pad for nums < 10
		s = String(d.getSeconds());
		s = (s < 10) ? String('0') + s : s; //zero pad
		var fdate = d.getHours() + ':'+ m + ':' + s;
		var display_str = '<p>NMEA record saved at ' + fdate + '</p>' ;

		// walk thru array & convert each NMEA string to object 
		for (var i in packetArr){
			display_str += packetArr[i] + '<br/>'; // append display str
			packetArr[i] = app.parseNmeaToObj(packetArr[i]);
		}
		// display time stored and sentences stored
		app.clearEl('last_nmea');
		app.displayToEl(display_str,'last_nmea');

		// send all records in array in bulk
		dBase.add(packetArr,function(results){
			// record the new time stored
			app.timeStored = new Date().getTime();
			//console.log('saved to pouch db');	
			// update number of records on device
			app.getRecordCount(function(num_rows){
				app.totalDeviceRecords = num_rows;
				app.displayStatus('num_device_records',num_rows);
			});
		});		
	},
/*
	update pouchDB to remote couchDB
*/
	saveToCouch: function(){
		app.changeConnectBtnState(); // change to progress button - also sets app.couchConnInProgress prop
		app.displayStatus('db','Connecting to CouchDB. Paused device storage.');

		// make sure there's a server address set
		if (!dBase.remoteServer || dBase.remoteServer == 'http://my.ip.addr:5984/'){
			alert('To connect to CouchDB, please set the server address.');
			console.log('remote server: ' + dBase.remoteServer);
		} else {
			// save to couch
			dBase.couchReplicate(function(alert_msg,success,recordsSaved){ 
				app.changeConnectBtnState();
				if (alert_msg){
					// show in couch status area at bottom
					$('#couchStatusMsg').html(alert_msg);

					// show shorter version of error msg in top status bar.
					if (!success){ 
						alert_msg = "Could not connect to CouchDB."; 
					}
					alert_msg += " Resumed device storage.";
					app.displayStatus('db',alert_msg); //display to top status
					// TODO: show total num of records in remote db -- use Pouch's count at the time of connection
					// log connection attempt
					app.logConnection({
							success: success,
							datetime: new Date(),
							address: dBase.remoteServer,
							dbName: dBase.remoteDbName,
							numRows: recordsSaved // num rows saved to db
						},function(){
							app.displayLastConnection();
						}); 
				}
			});
		}
	},
/*
	set hostname and db name for remote couch DB
*/
	setCouchServer: function(){
		dBase.remoteServer = app.formatIPAddress(document.getElementById('couchServer').value);
		dBase.remoteDbName = document.getElementById('couchDbName').value;
		alert('CouchDB settings saved.');
		// save it in local storage for next time
		localStorage.setItem('couchServerAddr',dBase.remoteServer);
		localStorage.setItem('couchDbName',dBase.remoteDbName);
		// in case there was a correction (trailing slash, etc), reset it in the input 
		document.getElementById('couchServer').value = dBase.remoteServer;
		// collapse ui element
		//app.configBoxExpandCollapse($('#couchConfig .config_form'));
	},
/*
	Checks for trailing slash, http://, and port and adds them if needed.
	pretty crude validation but fixes the most common errors
*/
	formatIPAddress: function(addr){
		addr = addr.trim();
		if (addr.substring(0,7) != 'http://' && addr.substring(0,8) != 'https://'){
			addr = 'http://' + addr;
		}
		if (addr.substring(addr.length - 1) != '/'){
			addr += '/';
		}
		// check for port number if there's not one, make it 5984
		var pattern = /\:\d{4}\/$/;
		var found = pattern.exec(addr);
		if (!found){
			// remove the slash and put it back
			addr = addr.substring(0,addr.length - 1) + ':5984/';
		}
		return addr;
	},
/*
	when there's a connection (attempt) to couch, save the info
*/
	logConnection: function(logObj,doStuff) {
		if(logObj.success){
			// save as most recent success
			logObj.lastSuccess = logObj;
		} 
		// only overwrite some properties (ie, don't copy the whole obj)
		app.lastRemoteConnection.success  = logObj.success;
		app.lastRemoteConnection.datetime = logObj.datetime;
		app.lastRemoteConnection.numRows  = logObj.numRows;
		app.lastRemoteConnection.address  = logObj.address;
		app.lastRemoteConnection.dbName   = logObj.dbName;
		console.log('logConnection called');
		console.log(logObj.success);
		console.log(JSON.stringify(app.lastRemoteConnection));
		
		// serialize the whole thing and save it to local storage
		localStorage.setItem('lastRemoteConnection',JSON.stringify(app.lastRemoteConnection));
		// callback
		doStuff();	
	},

	displayLastConnection: function() {
		var logObj = false; // stays false if there's no sucess recorded at all
		if (app.lastRemoteConnection.success){
			logObj = app.lastRemoteConnection;
		} else if (!app.lastRemoteConnection.success && app.lastRemoteConnection.lastSuccess){
			// if the last connection attempt failed, but there's a record of last success
			logObj = app.lastRemoteConnection.lastSuccess;
		}
		if (!logObj){ // if there is no record history
			// show "no history" status, hide history status divs
			$('#no-history').show();
			$('#history').hide();
		} else {
			//display
			$('#history').show();
			$('#no-history').hide();
			app.displayStatus('num_new_records',logObj.numRows);
			app.displayStatus('ip',logObj.address);
			app.displayStatus('time_stored',moment(logObj.datetime).format('HH:mm, MMM DD'));
		}
	},
/*
	set the number of seconds before each PouchDB store
*/
	setBufferInterval: function(){
		var secs = document.getElementById('secondsInput').value;
		if (!secs || secs < 15){ secs = 15;} // min 15 seconds
		app.timeInterval = secs * 1000;
		alert('Storage frequency set to '+ secs);
		// change status message
		app.displayStatus('freq', "Storing to device every " + secs + " seconds"); 
		// save preference
		localStorage.setItem('timeInterval',app.timeInterval);
		//app.configBoxExpandCollapse($('#storageConfig .config_form'));
	},

/*
	Wrapper around functions to process different types of NMEA sentences
	(some code borrowed from https://github.com/jamesp/node-nmea)
*/
	nmeaDecode: {
		rmc: function(nmeaArr){
			dt = app.parseGPSDateTime(nmeaArr[9],nmeaArr[1]); //human-readable datetime
			return {
				sentenceType: nmeaArr[0],
				UTtime: nmeaArr[1],
				status: nmeaArr[2],
				latitude: nmeaArr[3],
				dirNS: nmeaArr[4],
				longitude: nmeaArr[5],
				dirEW: nmeaArr[6],
				speed: nmeaArr[7],
				track: nmeaArr[8],
				UTdate: nmeaArr[9],
				variation: nmeaArr[10],
				EorW: nmeaArr[11],
				checksum: nmeaArr[12],
				UTCdateTime: dt
			};
		},
		gsv: function(nmeaArr) {
			/* 
		  	GSV has a variable number of fields, depending on the number of satellites found
				example: $GPGSV,3,1,12, 05,58,322,36, 02,55,032,, 26,50,173,, 04,31,085, 00*79
			The min number of fields is 4. After that, each satellite has a group of 4 values 
			
		  	*/
			var numFields = (nmeaArr.length - 4) / 4;
			var sats = [];
			for (var i=0; i < numFields; i++) {
				var offset = i * 4 + 4;
				sats.push({id: nmeaArr[offset],
				elevationDeg: +nmeaArr[offset+1],
				azimuthTrue: +nmeaArr[offset+2],
				SNRdB: +nmeaArr[offset+3]});
			}
			var checksum = nmeaArr[(nmeaArr.length - 1)];
			return {
				sentenceType: nmeaArr[0],
				numMsgs: nmeaArr[1],
				msgNum: nmeaArr[2],
				satsInView: nmeaArr[3],
				satellites: sats,
				checksum: checksum
			};
		}
	},
/*
	turn GPS date/time text (eg, date May 23, 2012 is 230512) into JS Date object
	function modified from https://github.com/dmh2000/node-nmea
	@udate in format ddmmyy, 	example: 160614   <-- June 16, 2014
	@utime in format hhmmss.ss, example: 180827.0 <-- 18:08:27.0
*/
	parseGPSDateTime: function(udate, utime) {
		// numbers must be strings first in order to use slice()
		udate = udate.toString();
		utime = utime.toString();
		var h = parseInt(utime.slice(0, 2), 10);
		var m = parseInt(utime.slice(2, 4), 10);
		var s = parseInt(utime.slice(4, 6), 10);
		var D = parseInt(udate.slice(0, 2), 10);
		var M = parseInt(udate.slice(2, 4), 10);
		var Y = parseInt(udate.slice(4, 6), 10);

		// hack : GPRMC date doesn't specify century. GPS came out in 1973
		// so if year is less than 73 its 2000, otherwise 1900
		if (Y < 73) {
			Y = Y + 2000;
		} else {
			Y = Y + 1900;
		}
		return new Date(Date.UTC(Y, M, D, h, m, s));
	},
/*
	Get number of records on device in PouchDB
*/
	getRecordCount: function(callback){
		dBase.numDocs(function(num_rows){
			//console.log("got number of pouch rows " + num_rows);
			callback(num_rows);

		});      
		
	},
/*
    appends @error to the message div:
*/
	showError: function(error) {
		//app.display(error);
	},

/*
    appends @message to the message div:
*/
	display: function(message) {
		var display = document.getElementById("message"),// the message div
			lineBreak = document.createElement("br"),     // a line break
			label = document.createTextNode(message);     // create the label
		
		display.appendChild(lineBreak);						// add a line break
		display.appendChild(label);							// add the message node
	},
	
/*
    clears the message div:
*/
	clear: function() {
		var display = document.getElementById("message");
		display.innerHTML = "";
	},
/*
	display @message to a particular element @div
*/
	displayToEl: function(message, div){
		jqdiv = $(document.getElementById(div));
		jqdiv.append(message + '<br/>');
	},
/*
	clear contents of a particular element @div
*/
	clearEl: function(div){
		var display = document.getElementById(div);
		display.innerHTML = "";
	},
/*
	sends messages to the the top status bar, 
	which has sections for db and device messages
	@status_type str to identify div
	@msg str to display
*/
	displayStatus: function(status_type,msg){
		var div = false;
		switch(status_type){
			// full status lines
			case 'db':
			case 'device':
			//case 'freq':
			//case 'storage':
			//case 'bt':
				//div = status_type + '_status';
				div = '#'+status_type + '_status';
				break;
			// pieces of records status line:
			case 'num_new_records':
			case 'ip':
			case 'time_stored':
			case 'num_device_records':
			case 'freq_secs':
				div = '#records_status #' + status_type;
		}
		if (div){
			//$('#'+div).html(msg);
			$(div).html(msg);
		}
	},

/* ===== UI elements ===== */
/*
	event listener for opening/closing configuration form boxes
*/
	toggleConfigSettings: function(evt){
		// form for this config section
		$(this).siblings("div.config_form").toggle();
		// icon in header
		$(this).children("span").toggleClass( "glyphicon-chevron-right glyphicon-chevron-down" );
	},
/*
	toggle the config form boxes. takes form object @form_el 
*/ 
	configBoxExpandCollapse: function(form_el){ //form element
		// show/hide the form
		form_el.toggle();
		//el.children("span").toggleClass( "glyphicon-chevron-right glyphicon-chevron-down" );
		// change arrow icon in header 
		form_el.siblings("h3.config_header span").toggleClass( "glyphicon-chevron-right glyphicon-chevron-down" );
	},
/*
	progress wheel display
*/
	changeConnectBtnState: function(){
		// if progress is off, start it
		if (app.couchConnInProgress === false){
			app.couchConnInProgress = true;
			// clear the Couch status box
			$('#couchStatusMsg').html('');
			var img = '<img src="img/blueloader32.gif" />';
			var txt = 'Connecting to Couch';
			$('#couchButton').html(img + ' ' + txt);
		} else { // if it's on, stop it
			app.couchConnInProgress = false; 
			$('#couchButton').html('Save to Couch');
			
		}
		
	}


};