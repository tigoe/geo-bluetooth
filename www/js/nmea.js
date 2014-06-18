// A NMEA-0183 parser based on the format given here: http://www.tronico.fi/OH6NT/docs/NMEA0183.pdf

var nmea = {

 /*
   MWV : require('./codecs/MWV.js'),
    VTG : require('./codecs/VTG.js'),
//    DBT : require('./codecs/DBT.js'),
    GLL : require('./codecs/GLL.js'),
    BWC : require('./codecs/BWC.js'),
    GSV : require('./codecs/GSV.js'),
    GSA : require('./codecs/GSA.js'),
    GGA : require('./codecs/GGA.js'),
    RMC : require('./codecs/RMC.js'),
    APB : require('./codecs/APB.js'),
*/

   
  
   validLine : function(line) {
       // check that the line passes checksum validation
       // checksum is the XOR of all characters between $ and * in the message.
       // checksum reference is provided as a hex value after the * in the message.
       var checkVal = 0;
       var parts = line.split('*');
       for (var i=1; i < parts[0].length; i++) {
           checkVal = checkVal ^ parts[0].charCodeAt(i);
       }
       return checkVal == parseInt(parts[1], 16);
   },
   
   parsers : {
     GGA: GGA.decode,
     RMC: RMC.decode,
     APB: APB.decode,
     GSA: GSA.decode,
     GSV: GSV.decode,
     BWC: BWC.decode,
//     DBT: DBT.decode,
     MWV: MWV.decode,
     VTG: VTG.decode,
     GLL: GLL.decode
   },
   
   /*
encoders : {
   MWV.TYPE : MWV,
   VTG.TYPE : VTG,
   DBT.TYPE : DBT,
   GLL.TYPE : GLL,
   }
*/
   
   parse : function(line) {
       if (validLine(line)) {
           var fields = line.split('*')[0].split(','),
               talker_id,
               msg_fmt;
           if (fields[0].charAt(1) == 'P') {
               talker_id = 'P'; // Proprietary
               msg_fmt = fields[0].substr(2);
           } else {
               talker_id = fields[0].substr(1, 2);
               msg_fmt = fields[0].substr(3);
           }
           var parser = parsers[msg_fmt];
           if (parser) {
               var val = parser(fields);
               val.talker_id = talker_id;
               return val;   
           } else {
             throw Error("Error in parsing:" + line);
           }
       } else {
         throw Error("Invalid line:" + line);
       }
   },
   
 /*
  encode : function(talker, msg) {
     if (typeof msg === 'undefined') {
       throw new Error("Can not encode undefined, did you forget msg parameter?");
     }
     encoder = encoders[msg.type];
     if (encoder) {
       return encoder.encode(talker, msg);
     } else {
       throw Error("No encoder for type:" + msg.type);
     }
   }
*/

};

var RMC = {
   TYPE : 'nav-info',
   ID : 'RMC',
  
   decode : function(fields) {
     return {
       sentence: ID,
       type: exports.TYPE,
       timestamp: fields[1],
       status: fields[2] == 'V' ? 'warning' : 'valid',
       lat: fields[3],
       latPole: fields[4],
       lon: fields[5],
       lonPole: fields[6],
       speedKnots: +fields[7],
       trackTrue: +fields[8],
       date: fields[9],
       variation: +fields[10],
       variationPole: fields[11]
     };
   }
};

var GGA = {
   TYPE : 'fix',
   ID : 'GGA',
   
   decode : function(fields) {
     var FIX_TYPE = ['none', 'fix', 'delta'];
     return {
       sentence: ID,
       type: TYPE,
       timestamp: fields[1],
       lat: fields[2],
       latPole: fields[3],
       lon: fields[4],
       lonPole: fields[5],
       fixType: FIX_TYPE[+fields[6]],
       numSat: +fields[7],
       horDilution: +fields[8],
       alt: +fields[9],
       altUnit: fields[10],
       geoidalSep: +fields[11],
       geoidalSepUnit: fields[12],
       differentialAge: +fields[13],
       differentialRefStn: fields[14]
     };
   } 
}; 
var APB = {
  ID :'APB',
  TYPE : 'autopilot-b',

  decode : function(fields) {
     /*
      === APB - Autopilot Sentence "B" ===
   
      13    15
      ------------------------------------------------------------------------------
      1 2 3   4 5 6 7 8   9 10   11  12|   14|
      | | |   | | | | |   | |    |   | |   | |
      $--APB,A,A,x.x,a,N,A,A,x.x,a,c--c,x.x,a,x.x,a*hh<CR><LF>
      ------------------------------------------------------------------------------
   
      Field Number:
   
      1. Status
      V = LORAN-C Blink or SNR warning
      V = general warning flag or other navigation systems when a reliable
      fix is not available
      2. Status
      V = Loran-C Cycle Lock warning flag
      A = OK or not used
      3. Cross Track Error Magnitude
      4. Direction to steer, L or R
      5. Cross Track Units, N = Nautical Miles
      6. Status
      A = Arrival Circle Entered
      7. Status
      A = Perpendicular passed at waypoint
      8. Bearing origin to destination
      9. M = Magnetic, T = True
      10. Destination Waypoint ID
      11. Bearing, present position to Destination
      12. M = Magnetic, T = True
      13. Heading to steer to destination waypoint
      14. M = Magnetic, T = True
      15. Checksum
      */
     return {
       sentence: ID,
       type: exports.TYPE,
       status1 : fields[1],
       status2 : fields[2],
       xteMagn : +fields[3],
       steerDir : fields[4],
       xteUnit : fields[5],
       arrivalCircleStatus : fields[6],
       arrivalPerpendicularStatus : fields[7],
       bearingOrig2Dest : +fields[8],
       bearingOrig2DestType : fields[9],
       waypoint : fields[10],
       bearing2Dest : +fields[11],
       bearingDestType : fields[12],
       heading2steer : +fields[13],
       headingDestType : fields[14]
     };
   }
};
var GSA = {
   TYPE : 'active-satellites',
   ID : 'GSA',
   
   decode : function(fields) {
     // $GPGSA,A,3,12,05,25,29,,,,,,,,,9.4,7.6,5.6
     var sats = [];
     for (var i=1; i < 13; i++) {
       if (fields[i+2]) sats.push(+fields[i+2]);
     }
     return {
       sentence: ID,
       type: TYPE,
       selectionMode: fields[1],
       mode: +fields[2],
       satellites: sats,
       PDOP: fields[15],
       HDOP: fields[16],
       VDOP: fields[17]
     };
   }  
};
var GSV = {
      ID : 'GSV',
   TYPE : 'satellite-list-partial',
   
   decode : function(fields) {
     // $GPGSV,3,1,12, 05,58,322,36, 02,55,032,, 26,50,173,, 04,31,085,
     var numRecords = (fields.length - 4) / 4,
       sats = [];
     for (var i=0; i < numRecords; i++) {
       var offset = i * 4 + 4;
       sats.push({id: fields[offset],
         elevationDeg: +fields[offset+1],
         azimuthTrue: +fields[offset+2],
         SNRdB: +fields[offset+3]});
     }
     return {
       sentence: ID,
       type: TYPE,
       numMsgs: +fields[1],
       msgNum: +fields[2],
       satsInView: +fields[3],
       satellites: sats
     };
   }
};
var BWC = {
   ID : 'BWC',
   TYPE : '2waypoint',
   
   decode : function(fields) {
     return {
       sentence: ID,
       type: exports.TYPE,
       lat: fields[2],
       latPole: fields[3],
       lon: fields[4],
       lonPole: fields[5],
       bearingtrue: fields[6],
       bearingmag: fields[8],
       distance: fields[10],
       id: fields[12]
     };
   }
};
//  var DBT : {};
// var MWV = {};
var VTG = {
   //var helpers = require("../helpers.js")
   /*
    === VTG - Track made good and Ground speed ===
   
    ------------------------------------------------------------------------------
    1  2  3  4  5  6  7  8 9   10
    |  |  |  |  |  |  |  | |   |
    $--VTG,x.x,T,x.x,M,x.x,N,x.x,K,m,*hh<CR><LF>
    ------------------------------------------------------------------------------
   
    Field Number:
   
    1. Track Degrees
    2. T = True
    3. Track Degrees
    4. M = Magnetic
    5. Speed Knots
    6. N = Knots
    7. Speed Kilometers Per Hour
    8. K = Kilometers Per Hour
    9. FAA mode indicator (NMEA 2.3 and later)
    10. Checksum=== VTG - Track made good and Ground speed ===
   
    ------------------------------------------------------------------------------
    1  2  3  4  5  6  7  8 9   10
    |  |  |  |  |  |  |  | |   |
    $--VTG,x.x,T,x.x,M,x.x,N,x.x,K,m,*hh<CR><LF>
    ------------------------------------------------------------------------------
   
    Field Number:
   
    1. Track Degrees
    2. T = True
    3. Track Degrees
    4. M = Magnetic
    5. Speed Knots
    6. N = Knots
    7. Speed Kilometers Per Hour
    8. K = Kilometers Per Hour
    9. FAA mode indicator (NMEA 2.3 and later)
    10. Checksum
    */
   TYPE : 'track-info',
   ID : 'VTG',
   
   decode : function (fields) {
     return {
       sentence: ID,
       type: 'track-info',
       trackTrue: +fields[1],
       trackMagnetic: +fields[3],
       speedKnots: +fields[5],
       speedKmph: +fields[7]
     };
   },
   
   encode : function (talker, msg) {
     var result = ['$' + talker + ID];
     result.push(helpers.encodeDegrees(msg.trackTrue));
     result.push('T');
     result.push(helpers.encodeDegrees(msg.trackMagnetic));
     result.push('M');
     result.push(helpers.encodeFixed(msg.speedKnots, 2));
     result.push('N');
     result.push('');
     result.push('');
     result.push('A');
     var resultMsg = result.join(',');
     return resultMsg + helpers.computeChecksum(resultMsg);
   }
   
};
// var GLL = {};
 
var helpers = {
   //Copied from from https://github.com/nherment/node-nmea/blob/master/lib/Helper.js
   
    m_hex : ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'],
   
   toHexString : function(v) {
     var lsn;
     var msn;
   
     msn = (v >> 4) & 0x0f;
     lsn = (v >> 0) & 0x0f;
     return m_hex[msn] + m_hex[lsn];
   },
   
   padLeft : function(s, len, ch) {
     while(s.length < len) {
       s = ch + s;
     }
     return s;
   },
   
   // verify the checksum
   verifyChecksum : function(sentence, checksum) {
     var q;
     var c1;
     var c2;
     var i;
   
     // skip the $
     i = 1;
   
     // init to first character
     c1 = sentence.charCodeAt(i);
   
     // process rest of characters, zero delimited
     for( i = 2; i < sentence.length; ++i) {
       c1 = c1 ^ sentence.charCodeAt(i);
     }
   
     // checksum is a 2 digit hex value
     c2 = parseInt(checksum, 16);
   
     // should be equal
     return ((c1 & 0xff) === c2);
   },
   
   // generate a checksum for  a sentence (no trailing *xx)
   computeChecksum : function(sentence) {
     var c1;
     var i;
   
     // skip the $
     i = 1;
   
     // init to first character    var count;
   
     c1 = sentence.charCodeAt(i);
   
     // process rest of characters, zero delimited
     for( i = 2; i < sentence.length; ++i) {
       c1 = c1 ^ sentence.charCodeAt(i);
     }
   
     return '*' + toHexString(c1);
   },
   
   // :========================================
   // field encoders
   // =========================================
   
   // encode latitude
   // input: latitude in decimal degrees
   // output: latitude in nmea format
   // ddmm.mmm
   encodeLatitude : function(lat) {
     var d;
     var m;
     var f;
     var h;
     var s;
     var t;
     if(lat === undefined) {
       return '';
     }
   
     if(lat < 0) {
       h = 'S';
       lat = -lat;
     } else {
       h = 'N';
     }
     // get integer degrees
     d = Math.floor(lat);
     // degrees are always 2 digits
     s = d.toString();
     if(s.length < 2) {
       s = '0' + s;
     }
     // get fractional degrees
     f = lat - d;
     // convert to fractional minutes
     m = (f * 60.0);
     // format the fixed point fractional minutes
     t = m.toFixed(3);
     if(m < 10) {
       // add leading 0
       t = '0' + t;
     }
   
     s = s + t + ',' + h;
     return s;
   },
   
   // encode longitude
   // input: longitude in decimal degrees
   // output: longitude in nmea format
   // dddmm.mmm
   encodeLongitude : function(lon) {
     var d;
     var m;
     var f;
     var h;
     var s;
     var t;
   
     if(lon === undefined) {
       return '';
     }
   
     if(lon < 0) {
       h = 'W';
       lon = -lon;
     } else {
       h = 'E';
     }
   
     // get integer degrees
     d = Math.floor(lon);
     // degrees are always 3 digits
     s = d.toString();
     while(s.length < 3) {
       s = '0' + s;
     }
   
     // get fractional degrees
     f = lon - d;
     // convert to fractional minutes and round up to the specified precision
     m = (f * 60.0);
     // minutes are always 6 characters = mm.mmm
     t = m.toFixed(3);
     if(m < 10) {
       // add leading 0
       t = '0' + t;
     }
     s = s + t + ',' + h;
     return s;
   },
   
   // 1 decimal, always meters
   encodeAltitude : function(alt) {
     if(alt === undefined) {
       return ',';
     }
     return alt.toFixed(1) + ',M';
   },
   
   // magnetic variation
   encodeMagVar : function(v) {
     var a;
     var s;
     if(v === undefined) {
       return ',';
     }
     a = Math.abs(v);
     s = (v < 0) ? (a.toFixed(1) + ',E') : (a.toFixed(1) + ',W');
     return padLeft(s, 7, '0');
   },
      
   // degrees
   encodeDegrees : function(d) {
     if(d === undefined) {
       return '';
     }
     return padLeft(d.toFixed(2), 6, '0');
   },
   
   encodeDate : function(d) {
     var yr;
     var mn;
     var dy;
   
     if(d === undefined) {
       return '';
     }
     yr = d.getUTCFullYear();
     mn = d.getUTCMonth() + 1;
     dy = d.getUTCDate();
     return padLeft(dy.toString(), 2, '0') + exports.padLeft(mn.toString(), 2, '0') + yr.toString().substr(2);
   },
   
   encodeTime : function(d) {
     var h;
     var m;
     var s;
   
     if(d === undefined) {
       return '';
     }
     h = d.getUTCHours();
     m = d.getUTCMinutes();
     s = d.getUTCSeconds();
     return padLeft(h.toString(), 2, '0') + exports.padLeft(m.toString(), 2, '0') + exports.padLeft(s.toString(), 2, '0');
   },
   
   encodeKnots : function(k) {
     if(k === undefined) {
       return '';
     }
     return padLeft(k.toFixed(1), 5, '0');
   },
   
   encodeValue : function(v) {
     if(v === undefined) {
       return '';
     }
     return v.toString();
   },
   
   encodeFixed : function(v, f) {
     if(v === undefined) {
       return '';
     }
     return v.toFixed(f);
   },
   
   // =========================================
   // field parsers
   // =========================================
   
   // separate number and units
   parseAltitude : function(alt, units) {
     var scale = 1.0;
     if(units === 'F') {
       scale = 0.3048;
     }
     return parseFloat(alt) * scale;
   },
   
   // separate degrees value and quadrant (E/W)
   parseDegrees : function(deg, quadrant) {
     var q = (quadrant === 'E') ? -1.0 : 1.0;
   
     return parseFloat(deg) * q;
   },
   
   // fields can be empty so have to wrap the global parseFloat
   parseFloatX : function(f) {
     if(f === '') {
       return 0.0;
     }
     return parseFloat(f);
   },
   
   // decode latitude
   // input : latitude in nmea format
   //      first two digits are degress
   //      rest of digits are decimal minutes
   // output : latitude in decimal degrees
   parseLatitude : function(lat, hemi) {
     var h = (hemi === 'N') ? 1.0 : -1.0;
     var a;
     var dg;
     var mn;
     var l;
     a = lat.split('.');
     if(a[0].length === 4) {
       // two digits of degrees
       dg = lat.substring(0, 2);
       mn = lat.substring(2);
     } else if(a[0].length === 3) {
       // 1 digit of degrees (in case no leading zero)
       dg = lat.substring(0, 1);
       mn = lat.substring(1);
     } else {
       // no degrees, just minutes (nonstandard but a buggy unit might do this)
       dg = '0';
       mn = lat;
     }
     // latitude is usually precise to 5-8 digits
     return ((parseFloat(dg) + (parseFloat(mn) / 60.0)) * h).toFixed(8);
   },
   
   // decode longitude
   // first three digits are degress
   // rest of digits are decimal minutes
   parseLongitude : function(lon, hemi) {
     var h;
     var a;
     var dg;
     var mn;
     h = (hemi === 'E') ? 1.0 : -1.0;
     a = lon.split('.');
     if(a[0].length === 5) {
       // three digits of degrees
       dg = lon.substring(0, 3);
       mn = lon.substring(3);
     } else if(a[0].length === 4) {
       // 2 digits of degrees (in case no leading zero)
       dg = lon.substring(0, 2);
       mn = lon.substring(2);
     } else if(a[0].length === 3) {
       // 1 digit of degrees (in case no leading zero)
       dg = lon.substring(0, 1);
       mn = lon.substring(1);
     } else {
       // no degrees, just minutes (nonstandard but a buggy unit might do this)
       dg = '0';
       mn = lon;
     }
     // longitude is usually precise to 5-8 digits
     return ((parseFloat(dg) + (parseFloat(mn) / 60.0)) * h).toFixed(8);
   },
   
   // fields can be empty so have to wrap the global parseInt
   parseIntX : function(i) {
     if(i === '') {
       return 0;
     }
     return parseInt(i, 10);
   },
   
   parseDateTime : function(date, time) {
     var h = parseInt(time.slice(0, 2), 10);
     var m = parseInt(time.slice(2, 4), 10);
     var s = parseInt(time.slice(4, 6), 10);
     var D = parseInt(date.slice(0, 2), 10);
     var M = parseInt(date.slice(2, 4), 10);
     var Y = parseInt(date.slice(4, 6), 10);
     // hack : GPRMC date doesn't specify century. GPS came out in 1973
     // so if year is less than 73 its 2000, otherwise 1900
     if (Y < 73) {
       Y = Y + 2000;
     }
     else {
       Y = Y + 1900;
     }
   
     return new Date(Date.UTC(Y, M, D, h, m, s));
   }
};
