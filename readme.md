## Geo-Blueotooth

This is a project to test reading GPS data from a Garmin GLO via Bluetooth. It uses Don Coleman's [BluetoothSerial plugin for PhoneGap/Cordova](https://github.com/don/BluetoothSerial).


### To install the project:

* Clone this repo

 $ git clone https://github.com/tigoe/geo-bluetooth

* change directories to the repo:

	$ cd geo-bluetooth
	
* Add the Android platform:

	$ cordova platform add android

* AND/OR add the iOS plaform 

	$ cordova platform add ios

* Add the Bluetooth plugin:

	$ cordova plugin add com.megster.cordova.bluetoothserial

* Plug in your android device, then compile and run:

	$ cordova run

_**iOS Note:** The iOS status bar overlaps the phonegap app in an ugly way. It's not crucial,  but if you like, you can fix  by changing a few lines of iOS code. In your phonegap project, open the file /platforms/ios/geo-bluetooth/Classes/MainViewController.m and copy and paste the code described here: http://stackoverflow.com/a/19249775/225134_

### To set up CouchDB for use with the app.

* Connect your mobile device and your computer to the same Wi-Fi network.

* Download and install CouchDB for OSX as described in <http://docs.couchdb.org/en/latest/install/mac.html#installation-using-the-apache-couchdb-native-application>

* Confirm that Couch is running by visiting localhost:5984/_utils (or *127.0.0.1* instead of *localhost*) in a browser. This is the GUI interface for CouchDB, called *Futon*.

* [UPDATE! optional. Couch will create a new database in the sync process if it does not exist.] In Futon, choose "Create New Database" and call the new database whatever you like. 

* In OSX System Preferences > Network, find your IP address. It will say something like, *"Wi-Fi is connected to MyAwesomeNetwork and has the IP address 192.168.1.2"*

* Test that the IP address works on your Android & that CouchDB is available. In the browser on your mobile device, type your IP and add the port number, eg., 192.168.1.3:5984. If it works, you'll see a short JSON string, like: 

	{"couchdb":"Welcome","uuid":"fec59fb0d1263eb47eea6c05b472c14c","version":"1.5.1","vendor":{"version":"1.5.1","name":"The Apache Software Foundation"}}

* In the geo-bluetooth application, under "Configure CouchDB", set the *Server URL* to http://YOUR_IP_ADDRESS:5984/ as above (http and trailing slash are important) and *Database Name* to the name of the CouchDB database you just created.


