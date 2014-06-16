
var app = {
	deviceAddress: "AA:BB:CC:DD:EE:FF",  // get your mac address from bluetoothSerial.list
	deviceName: "No Name",
	chars: "",

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
		scanButton.addEventListener('touchend', app.listPorts, false);
		devices.addEventListener('change', app.selectPort, false);
	},
	// deviceready Event Handler
	//
	// The scope of 'this' is the event. In order to call the 'receivedEvent'
	// function, we must explicity call 'app.receivedEvent(...);'
	onDeviceReady: function() {
		app.receivedEvent('deviceready');
	},
    
    // Update DOM on a Received Event
    receivedEvent: function(id) {
        // check to see if Bluetooth is turned on.
        // this function is called only
        //if isEnabled(), below, returns success:
        app.listPorts();
        
        // if isEnabled returns failure, this function is called:
        var notEnabled = function() {
            app.display("Bluetooth is not enabled.");
        };
       

         // check if Bluetooth is on:
        bluetoothSerial.isEnabled(
            listPorts,
            notEnabled
        );
    },
    
    listPorts: function() {
            // list the available BT ports:
            bluetoothSerial.list(
                function(results) {
		          		var devices = document.getElementById('devices');
					 		// clear the select list first:
					 		devices.innerHTML = "";
	   					// result is an array of JSON objects. 
							// iterate over it and pull out relevant elements.
							// on iOS, address is called uuid. On Android it's called address:                  
                    
                    for (i=0; i<results.length; i++) {
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
	                    app.display("No BT Serial devices found");
                    }
                    // use the first item from the list as your address:
                    app.deviceAddress = devices.options[devices.selectedIndex].value;
                    app.deviceName = devices.options[devices.selectedIndex].innerHTML;
                    app.display(app.deviceAddress + " " + app.deviceName); 
                },
                function(error) {
                    app.display(JSON.stringify(error));
                }
            );
        },
        
        selectPort: function() {
        	  var devices = document.getElementById('devices');
			  // use the first item from the list as your address:
	        app.deviceAddress = devices.options[devices.selectedIndex].value;
	        app.deviceName = devices.options[devices.selectedIndex].innerHTML;
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
            	 app.deviceAddress + 
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
        app.display("Connected to: " + app.deviceAddress);
        // change the button's name:
        connectButton.innerHTML = "Disconnect";
        // set up a listener to listen for newlines
        // and display any new data that's come in since
        // the last newline:
        bluetoothSerial.subscribe('\n', function (data) {
            app.clear();
            app.display(data);
        });
    },

/*
    unsubscribes from any Bluetooth serial listener and changes the button:
*/
    closePort: function() {
        // if you get a good Bluetooth serial connection:
        app.display("Disconnected from: " + app.deviceAddress);
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
/*
    clears the message div:
*/
	clear: function() {
		var display = document.getElementById("message");
		display.innerHTML = "";
	}
};





