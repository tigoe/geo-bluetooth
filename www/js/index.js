var app = {
	deviceAddress: "AA:BB:CC:DD:EE:FF",  // get your mac address from bluetoothSerial.list
	deviceName: "No Name",
	pouchDBName: "mypouchgeo", // name of the database pouchDB uses locally on device (NOT remote couchDB)
	nmeaPacket: [], // group of nmea sentences, used for buffering	
	timeStored: new Date().getTime(), // track last save to PouchDB (milliseconds) 
	timeInterval: 30 * 1000, // min time between each save to PouchDB (seconds to milliseconds)
	portOpen: false, // keep track of whether BT is connected

	// Application Constructor
	initialize: function() {
		this.bindEvents();

		// DATABASE: new PouchDB instance
		if (!this.pouchDBName){
			this.pouchDBName = 'mypouchdb';
		}
		dBase.init(this.pouchDBName);

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
		configButton.addEventListener('touchend', app.setCouchServer, false);
		secondsButton.addEventListener('touchend', app.setBufferInterval, false);
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicity call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		// if remote server info for CouchDB is stored, use it
		//console.log('local storage: ' + localStorage.getItem('couchServerAddr'));
		if (localStorage.getItem('couchServerAddr')){
			dBase.remoteServer = localStorage.getItem('couchServerAddr');
			document.getElementById('couchServer').value = localStorage.getItem('couchServerAddr');
		}
		if (localStorage.getItem('couchDbName')){
			dBase.remoteDbName = localStorage.getItem('couchDbName');
			document.getElementById('couchDbName').value = localStorage.getItem('couchDbName');
		}
		// bluetooth
		app.checkBluetooth();

	},
    
	// Check Bluetooth, list ports if enabled:
	checkBluetooth: function() {          
		// if isEnabled returns failure, this function is called:
		var notEnabled = function() {
			app.clear();
			app.display("Bluetooth is not enabled.");
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
						app.clear();
						app.display("No BT Serial devices found");
					}
					// show the name of the selected port:
					app.selectPort();
				},
					
				// called if something goes wrong with isEnabled:
				function(error) {
					app.display(JSON.stringify(error));
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
		app.clear();
		app.display(app.deviceAddress + " " + app.deviceName); 
	},

        
 /*
    Connects if not connected, and disconnects if connected:
*/
	manageConnection: function() {
		
		// connect() will get called only if isConnected() (below)
		// returns failure. In other words, if not connected, then connect:
		var connect = function () {
			// if not connected, do this:
			// clear the screen and display an attempt to connect
			app.clear();
			app.display("Attempting to connect to " +
				app.deviceName + 
				"Make sure the serial port is open on the target device.");
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
			app.display("attempting to disconnect");
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
		app.display("Connected to: " + app.deviceName);
		var secs = app.timeInterval / 1000;
		var statusMsg = "Connected to: " + app.deviceName + ". Storing to device every " + secs + " seconds";
		app.showStatus(statusMsg);
		app.portOpen = true;
		
		// change the button's name:
		connectButton.innerHTML = "Disconnect";
		// change button color
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
		app.display("Disconnected from: " + app.deviceName);
		app.showStatus("Disconnected from: " + app.deviceName);
		app.portOpen = false;
		// change the button's name:
		connectButton.innerHTML = "Connect";
		// change button color
		$(connectButton).removeClass('btn-danger');
		$(connectButton).addClass('btn-success');
		// unsubscribe from listening:
		bluetoothSerial.unsubscribe(
			function (data) {
				app.display(data);
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
			// but only if it has been more than n seconds since the last db store
			if(new Date().getTime() > (app.timeStored + app.timeInterval)){
				app.storeNmeaPacket(app.nmeaPacket);
				// record the new time stored
				app.timeStored = new Date().getTime();
				
				// show the packet contents
				//app.displayNmeaPacket(app.nmeaPacket);
			} 
			// Begin a new packet 
			app.nmeaPacket = [];
			// clear screen
			app.clear();
		} 
		// if you get any NMEA sentence, beginning with $ :
		if (firstField.substring(0,1) === '$') {	
			// convert it to an object
			//nmeaObj = app.parseNmeaToObj(data);

			// save it to the packet array
			// store just text sentence for now -- only convert to object if you're going to save it
			app.nmeaPacket.push(data); 
			//app.nmeaPacket.push(nmeaObj);
			app.display(data);
		}
	},

/*
	converts an NMEA sentence into an object
*/
	parseNmeaToObj: function(nmeaStr){
		// example sentence string: $GPRMC,180826.9,V,4043.79444,N,07359.60944,W,,,160614,013.0,W,N*19
		// make it an array:
		nmeaArr = nmeaStr.split(",");
		
		// find the type
		typeProp = nmeaArr[0].slice(-3).toLowerCase();
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
		// store the whole sentence regardless of type
		nmeaObj.nmeaSentence = nmeaStr;
		
		return nmeaObj;
	},
/*
	store the array of NMEA sentence objects to Pouch
*/	
	storeNmeaPacket: function(packetArr){
		// walk thru array & convert each NMEA string to object 
		for (var i in packetArr){
			packetArr[i] = app.parseNmeaToObj(packetArr[i]);
		}

		// add in all records in array in bulk
		dBase.add(packetArr,function(results){
			console.log('saved to pouch db');
		});
		
	},
/*
	update pouchDB to remote couchDB
*/
	saveToCouch: function(){
		if (app.portOpen){ // disconnect to BT if connected
			//app.closePort();
			app.manageConnection();
			/* TODO: fix status bar handling! */
			app.showStatus('Closed Bluetooth connection while connecting to DB');
			app.display('Closed Bluetooth connection while connecting to DB');
		}
		dBase.couchReplicate(function(){ 
			console.log("DEBUG: couchReplicate");
			// unless they've connected to BT before db procedure finished, re-connect
			if (!portOpen){
				app.manageConnection();
				app.showStatus('Reconnected to Bluetooth.');
			}
		});
		//alert('Attempting to connect to CouchDB ...');
	},
/*
	set hostname and db name for remote couch DB
*/
	setCouchServer: function(){
		dBase.remoteServer = document.getElementById('couchServer').value;
		dBase.remoteDbName = document.getElementById('couchDbName').value;
		alert('CouchDB settings saved.');
		// save it in local storage for next time
		localStorage.setItem('couchServerAddr',dBase.remoteServer);
		localStorage.setItem('couchDbName',dBase.remoteDbName);
		///console.log('local storage : ' + localStorage.getItem('couchServerAddr'));
	},

/*
	set the number of seconds before each PouchDB store
*/
	setBufferInterval: function(){
		var secs = document.getElementById('secondsInput').value;
		if (!secs || secs < 15){ secs = 15;} // wait at least 15 seconds
		app.timeInterval = secs * 1000;
		alert('Storage frequency set to '+ secs);
	},
/*
	displays all the nmea sentences in an array (aka, packet)
*/
	displayNmeaPacket: function(nmeaArr){ 
		
		//app.display('Stored NMEA sentences to device:');
		// the nmea objects retain the original sentence in 'nmeaSentence' property
		for (var i in nmeaArr){
			app.display(nmeaArr[i].nmeaSentence);
			//app.display(nmeaArr[i]);
		}
	},
/*
	An object containing functions to process diff types of NMEA sentences
	(some code borrowed from https://github.com/jamesp/node-nmea)
*/
	nmeaDecode: {
		rmc: function(nmeaArr){
			dt = app.parseGPSDateTime(nmeaArr[9],nmeaArr[1]);
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
			The min number of fields is 4
			
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
    appends @error to the message div:
*/
	showError: function(error) {
		app.display(error);
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
    changes status bar text to @msg
*/
	showStatus: function(msg){
		statusDiv = document.getElementById("status");
		statusDiv.innerHTML = msg;
	}
};