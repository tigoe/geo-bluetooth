var app = {
	deviceAddress: "AA:BB:CC:DD:EE:FF",  // get your mac address from bluetoothSerial.list
	deviceName: "No Name",
	pouchDBName: "mypouchgeo", // name of the database pouchDB uses locally on device (NOT remote couchDB)
	nmeaPacket: [], // group of nmea sentences, used for buffering
	
	timeStored: new Date().getTime() / 1000, // track last save to PouchDB (milliseconds) 
	timeInterval: 30 * 1000, // min time between each save to PouchDB (seconds to milliseconds)

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
		// change the button's name:
		connectButton.innerHTML = "Disconnect";
		// change button color
		$(connectButton).removeClass('btn-success');
		$(connectButton).addClass('btn-danger');
		// set up a listener to listen for newlines
		// and display any new data that's come in since
		// the last newline:
		bluetoothSerial.subscribe('\n', function (data) {
			//console.log('GOT DATA: ' + data);
			
			var now = new Date().getTime();
			if (data.split(',')[0] === '$GPRMC') { //assume RMC is the beginning of a packet
				// if it's been n+ seconds since you last stored a packet
				if((app.timeStored + app.timeInterval) >= now){
					//app.storeNmeaPacket(app.nmeaPacket);
				} 

				// make a new Packet
				app.nmeaPacket = [];
				// clear screen
				app.clear();

			} 
			// if you get any NMEA sentence, beginning with $ :
			if (data.split(',')[0].substring(0,1) === '$') {	
				// convert it to an object
				nmeaObj = app.parseNmeaToObj(data);

				// save it to the packet array
				app.nmeaPacket.push(nmeaObj);
			}
			// display the sentence:
			app.display(data);

		});
	},

/*
    unsubscribes from any Bluetooth serial listener and changes the button:
*/
	closePort: function() {
		// if you get a good Bluetooth serial connection:
		app.display("Disconnected from: " + app.deviceName);
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
	converts an NMEA sentence into an object
*/
	parseNmeaToObj: function(nmeaStr){
		// example sentence string: $GPRMC,180826.9,V,4043.79444,N,07359.60944,W,,,160614,013.0,W,N*19
		// make it an array:
		nmeaArr = nmeaStr.split(",");
		// but couch needs it to be an object:
		nmeaObj = {};
		// first store the whole sentence
		nmeaObj.nmeaSentence = nmeaStr;
		// find the type
		typeProp = nmeaArr[0].slice(-3).toLowerCase();
		// get the corresponding object with fields for that type -- if it exists
		if(typeProp in app.nmeaFormats){
			formatObj = app.nmeaFormats[typeProp];
			// use the properties from app.nmeaFormats
			index = 0;
			for (var prop in app.nmeaFormats.rmc){
			    if (!(index in nmeaArr)){
			        break;
			    }
				nmeaObj[prop] = nmeaArr[index];
			    index++;
			}
		} else { // if the type is not defined, store the fields with numeric key names
			//add the sentence type as a named field
			nmeaObj.sentenceType = nmeaArr[0];
			for (var i=0; i < nmeaArr.length; i++){
				nmeaObj[i] = nmeaArr[i]; 
			}
		}
		
		return nmeaObj;
	},
/*
	store the array of NMEA sentence objects to Pouch
*/	
	storeNmeaPacket:function(packetArr){
		// add in all records in array in bulk
		dBase.add(packetArr,function(results){
			console.log('saved to pouch db');
		});
		/*for (var i in packetArr){
			dBase.add(packetArr[i],function(results){
				//console.log('saved to pouch db');
			});
		}*/
	},
/*
	moves pouchDB to remote couchDB
*/
	saveToCouch: function(){
		dBase.couchReplicate();
		alert('attempting to connect to CouchDB');
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
		//console.log('local storage: ' + localStorage.getItem('couchServerAddr'));
	},

/*
	set the number of seconds before each PouchDB store
*/
	setBufferInterval: function(secs){
		// secs * 1000

	},

	nmeaFormats:{
		rmc: {
			sentenceType: null,	//0
			time: null,			//1
			status: null,		//2
			latitude: null,		//3
			dirNS: null,		//4
			longitude: null,	//5
			dirEW: null,		//6
			speed: null,		//7
			track: null,		//8
			UTdate: null,		//9
			variation: null,	//10
			EorW: null,			//11
			checksum: null		//12
		},
		gsv: {
			sentenceType: null, //0
			numMessages: null,	//1
			messageNum: null,	//2
			checksum: null		//3
		}
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
	}
};