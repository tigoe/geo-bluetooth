var app = {
	deviceAddress: "AA:BB:CC:DD:EE:FF",  // get your mac address from bluetoothSerial.list
	deviceName: "No Name",
	pouchDBName: "mypouchgeoraw0701-1110p", // name of the database pouchDB uses locally on device (NOT remote couchDB)
	nmeaPacket: [], // group of nmea sentences, used for buffering
	usingRaw: true,	
	nmeaRawArr: [], // array of all sentences (this COULD be in local storage instead ... ?)
	nmeaFirstSentenceType: '', // for raw data, don't assume RMC -- just get the first type that comes thru
	pouchObjCreated: false, // track creation of new object to contain attachment
	timeStored: new Date().getTime(), // track last save to PouchDB (milliseconds) 
	timeInterval: 30 * 1000, // min time between each save to PouchDB (seconds to milliseconds)
	portOpen: false, // keep track of whether BT is connected
	couchConnInProgress: false, //track wheter a connection to remote db is in progress
	totalDeviceRecords: 0, // track num of pouch records on device
	metaConnectionLog: {}, // stores open/close BT connection times and storage interval
	//info about last connection to couch
	lastRemoteConnection: {
		success: false,
		datetime: false,
		numRows: 0,
		address: 0,
		dbName: '',
		lastSuccess: false // in case this attempt failed, remember details of last successful one (object)
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
		//$(".config_header").click(app.toggleConfigSettings);
		$(".config_header").bind('touchend',app.toggleConfigSettings);
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicity call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		// get saved settings from previous run (server address, etc)
		app.getStoredSettings();

		// bluetooth
		app.checkBluetooth();

		// DATABASE: new PouchDB instance
		if (!this.pouchDBName){
			this.pouchDBName = 'mypouchdb123';
		}
		dBase.init(this.pouchDBName);

		// how many records on the device right now?
		app.getRecordCount(function(num_rows){
			app.totalDeviceRecords = num_rows;
			//app.displayStatus('storage',num_rows + ' Records on device');
			app.displayStatus('num_device_records',num_rows);
		}); 
		// show storage frequency settings
		app.displayStatus('freq_secs',app.timeInterval/1000);
		// display remote storage history
		app.displayLastConnection();
	},
/*
	pull up saved settings from local storage
*/
	getStoredSettings: function(){
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
			app.displayStatus('device',"Attempting to connect to <b>" + app.deviceName + "</b>");
			
			// if not connected, do this:
			var btFail = function(err){
				// in the event we WERE connected, but now are not
				if (app.portOpen){
					app.displayStatus('device',"Lost connection to <b>" + app.deviceName + "</b>");	
				} else {
					app.displayStatus('device',"Could not connect to <b>" + app.deviceName + "</b>");
				}
				// log  BT connection 
				app.logBTConnection('end');
				// make sure the button shows the right state
				app.setBTConnectionButton("connect");
				
			};
			// attempt to connect:
			bluetoothSerial.connect(
				app.deviceAddress,  // device to connect to
				app.openPort,    // start listening if you succeed
				btFail    // show the error if you fail
			);
		};
			
		// disconnect() will get called only if isConnected() (below)
		// returns success  In other words, if  connected, then disconnect:
		var disconnect = function () {
			//app.display("Attempting to disconnect");
			app.displayStatus('device',"Attempting to disconnect from <b>" + app.deviceName + "</b>");
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
		app.portOpen = true;
		
		// show connected status
		var secs = app.timeInterval / 1000;
		var startTime = moment().format('HH:mm, MMM DD');
		app.displayStatus('device',"Connected to <b>" + app.deviceName + "</b> at " + startTime);
		app.displayStatus('freq_secs', secs);
		app.displayStatus('db',''); //clear db status message

		// log  BT connection
		app.logBTConnection('start');
			
		app.setBTConnectionButton("disconnect");

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
		app.displayStatus('device',"Disconnected from <b>" + app.deviceName + "</b>");
		app.portOpen = false;
		// log  BT connection
		app.logBTConnection('end');
		
		app.setBTConnectionButton("connect");
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
		var sentenceType = data.split(',')[0]; // eg, $GPXYZ
		// use the first sentence we see as the base, to know when it's made a round, and to make a new packet
		if (!app.nmeaFirstSentenceType){
			app.nmeaFirstSentenceType = sentenceType;
		}
		// if it has made its full round of sentences, this is the end of a packet, time to store (or discard)
		if (app.nmeaFirstSentenceType == sentenceType && app.nmeaPacket.length > 0){
			// has enough time elapsed since last store? 
			if(new Date().getTime() > (app.timeStored + app.timeInterval) && !app.couchConnInProgress){
				// parse the sentences, get back objects
				var packetObjs = nmea.parse(app.nmeaPacket);
				// store a string version for display later
				var sentences = app.nmeaPacket.join('<br/>');
				// for raw text:
				// store everything from the packet into the master array of sentences
				app.nmeaRawArr.push.apply(app.nmeaRawArr,app.nmeaPacket);

				// store array of objects to Pouch
				dBase.add(packetObjs,function(results){
					// record the new time stored
					app.timeStored = new Date().getTime();
					
					// feedback re: storage:
					var fdate = moment(new Date(app.timeStored)).format('HH:mm:ss');
					var display_str = '<p>NMEA record saved at ' + fdate + '</p>' ;
					display_str += sentences;
					// display time stored and sentences stored
					app.clearEl('last_nmea');
					app.displayToEl(display_str,'last_nmea');
					
					// update number of records on device & display
					app.getRecordCount(function(num_rows){
						app.totalDeviceRecords = num_rows;
						app.displayStatus('num_device_records',num_rows);
					});
				});
			}
			// Begin a new packet 
			app.nmeaPacket = [];
			// clear screen
			app.clearEl('live_nmea'); 
		}
		// add the sentence to the packet array
		app.nmeaPacket.push(data); 
		// Show the current sentence 
		app.displayToEl(data,'live_nmea');
	},

	createAttachmentRecord:function(){
		//console.log('pouchObjCreated bool = ' + app.pouchObjCreated);
		dBase.attachTxtFile(false,app.nmeaRawArr,'nmeatext').then(function(){
			console.log("THEN attach");
			app.pouchObjCreated = true;
			app.saveToCouch();
		}); 
	},
/*
	update pouchDB to remote couchDB
*/
	saveToCouch: function(){
		// for raw data (attachment), create pouch record w/ attachment
		if (app.usingRaw && !app.pouchObjCreated){
			app.createAttachmentRecord();
			return; 
		}
		console.log('hello from saveToCouch. /// pouchObjCreated bool = ' + app.pouchObjCreated);
		app.changeConnectBtnState(); // change to progress button - also sets app.couchConnInProgress prop
		app.displayStatus('db','Connecting to CouchDB. Paused device storage.');
		if (app.metaConnectionLog.end_connection_time === false){
			app.logBTConnection('end');
		}

		// make sure there's a server address set
		if (!dBase.remoteServer || dBase.remoteServer == 'http://my.ip.addr:5984/'){
			alert('To connect to CouchDB, please set the server address.');
			//console.log('remote server: ' + dBase.remoteServer);
		} else {
			// save to couch
			dBase.couchReplicate(function(alert_msg,success,recordsSaved){ 
				app.changeConnectBtnState();
				if (alert_msg){
					// show in couch status area at bottom
					$('#couchStatusMsg').html(alert_msg);

					if (!success){ 
						// show shorter version of error msg in top status bar.
						alert_msg = "Could not connect to CouchDB."; 
					} else {
						// update number of local records 
						//   -- 1 additional record is added for attachment at time of connection to couch
						app.getRecordCount(function(num_rows){
							app.totalDeviceRecords = num_rows;
							app.displayStatus('num_device_records',num_rows);
						});
					}
					alert_msg += " Resumed device storage.";
					app.displayStatus('db',alert_msg); //display to top status
					 
					// log connection attempt
					app.logConnection({
							success: success,
							datetime: new Date(),
							address: dBase.remoteServer,
							dbName: dBase.remoteDbName,
							numRows: recordsSaved // num rows saved to db
						},function(){
							app.displayLastConnection();
							// for the raw data version: reset the raw data obj flags
							app.pouchObjCreated = false;
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
	logConnection: function(logObj,callback) {
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
		//console.log('logConnection called');
		//console.log(logObj.success);
		//console.log(JSON.stringify(app.lastRemoteConnection));
		
		// serialize the whole thing and save it to local storage
		localStorage.setItem('lastRemoteConnection',JSON.stringify(app.lastRemoteConnection));
		// callback
		callback();	
	},
	// meta data to be stored in db re: connections to BT device and storage interval
	logBTConnection: function(start_or_end){
		if (start_or_end == 'start'){
			// start a connection log db record
			app.metaConnectionLog.objtype = "connection-meta";
			app.metaConnectionLog.start_connection_time = new Date();
			app.metaConnectionLog.end_connection_time = false;
			app.metaConnectionLog.interval_length_secs = app.timeInterval / 1000;
			dBase.add(app.metaConnectionLog,function(res){
				// when sending this doc back to couch on edit, id and rev properties much have underscores
				app.metaConnectionLog._id = res.id;
				app.metaConnectionLog._rev = res.rev;
			});
		} else if (start_or_end == 'end'){
			// set the disconnect time
			app.metaConnectionLog.end_connection_time = new Date();
			dBase.update(app.metaConnectionLog,function(res){
				//reset this object
				app.metaConnectionLog = {};
			});
		}
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
		
	},
/*
	Button for connecting/disconnecting from Bluetooth
	Takes an explicit @state to change to, 'connect' or 'disconnect'
*/
	setBTConnectionButton: function(state){
		if (state.toLowerCase() == "connect"){
			connectButton.innerHTML = "Connect";
			$(connectButton).removeClass('btn-danger');
			$(connectButton).addClass('btn-success');
		} else {
			connectButton.innerHTML = "Disconnect";
			$(connectButton).removeClass('btn-success');
			$(connectButton).addClass('btn-danger');
		}	
	}
};