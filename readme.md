Geo-Blueotooth

This is a project to test reading GPS data from a Garmin GLO via Bluetooth. It uses Don Coleman's [BluetoothSerial plugin for PhoneGap/Cordova](https://github.com/don/BluetoothSerial).


To install the project:

* Clone this repo

 $ git clone https://github.com/tigoe/geo-bluetooth

* change directories to the repo:

	$ cd geo-bluetooth
	
* Add the Android platform:

	$ cordova platform add android

* Add the Bluetooth plugin:

	$ cordova plugin add com.megster.cordova.bluetoothserial

* Plug in your android device, then compile and run:

	$ cordova run

