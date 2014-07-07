/*
	Utility functions for parsing NMEA sentences (RO)
	uses code borrowed/modified from https://github.com/jamesp/node-nmea
*/
var nmea = {
	// take in sentence string or array of sentence strings
	parse: function(strOrArr){
		if (strOrArr instanceof Array){
			sArr = [];
			for (var i in strOrArr){
				sArr.push(nmea.sentenceToObj(strOrArr[i]));
			}
			return sArr;
		} else if (typeof strOrArr === 'string') {
			return nmea.sentenceToObj(strOrArr);
		}
	},
/* 
	Break up NMEA sentences of certain types into known fields
	Handles: RMC, GSV
	Other common types, to add: GGA, GSA, VTG
*/
	decode: {
		rmc: function(nmeaArr){
			dt = nmea.convertGPSDateTime(nmeaArr[9],nmeaArr[1]); //human-readable datetime
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
	sentenceToObj: function(nmeaStr){
		// example sentence string: $GPRMC,180826.9,V,4043.79444,N,07359.60944,W,,,160614,013.0,W,N*19
		// make it an array:
		nmeaArr = nmeaStr.split(",");
		
		// find the type
		typeProp = nmeaArr[0].slice(-3).toLowerCase(); //eg: rmc
		// process the sentence if the type is in the nmeaDecode object
		if(typeProp in nmea.decode){
			nmeaObj = nmea.decode[typeProp](nmeaArr);
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
	Turn GPS date/time text (eg, date May 23, 2012 is 230512) into JS Date object
	function modified from https://github.com/dmh2000/node-nmea
	@udate in format ddmmyy, 	example: 160614   <-- June 16, 2014
	@utime in format hhmmss.ss, example: 180827.0 <-- 18:08:27.0
	*/
	convertGPSDateTime: function(udate, utime) {
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
		// so if year is less than 73 it's 2000, otherwise 1900
		if (Y < 73) {
			Y = Y + 2000;
		} else {
			Y = Y + 1900;
		}
		return new Date(Date.UTC(Y, M, D, h, m, s));
	}

};