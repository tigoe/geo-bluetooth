
var app = {
	deviceAddress: "AA:BB:CC:DD:EE:FF",  // get your mac address from bluetoothSerial.list
	deviceName: "No Name",
	
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
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicity call 'app.receivedEvent(...);'
	onDeviceReady: function() {
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
			app.display("Attempting to connect to" +
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
		// set up a listener to listen for newlines
		// and display any new data that's come in since
		// the last newline:
		bluetoothSerial.subscribe('\n', function (data) {
			// if you get a $GPRMC sentence, clear the screen:
			if (data.split(',')[0] === '$GPRMC') {
				app.clear();
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
		// unsubscribe from listening:
		bluetoothSerial.unsubscribe(
			function (data) {
				app.display(data);
			},
			app.showError
		);
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
	
	
	displayNmea: function(nmeaObject) {
		// will make this into a function that displays a JSON object:
		var display = document.getElementById("message");// the message div
		display.innerHTML = "";
		for (var field in nmeaObject) {
			display.innerHTML += field + ":" + nmeaObject[field] + "<br>";
		}
	},

/*
    clears the message div:
*/
	clear: function() {
		var display = document.getElementById("message");
		display.innerHTML = "";
	}
};