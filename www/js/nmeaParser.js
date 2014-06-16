nmeaParser = {
    sentenceToArray: function (sentence){
        return sentence.split('*')[0].split(',');
    },

    parse: function(sentence){
        fields = this.sentenceToArray(sentence);
        
        sentenceType = fields[0].substr(3);
        /*if (fields[0].charAt(1) == 'P') {
            //talker_id = 'P'; // Proprietary
            sentenceType = fields[0].substr(2);
        } else {
            //talker_id = fields[0].substr(1, 2);
            sentenceType = fields[0].substr(3);
        }*/

        switch (sentenceType) {
	        'RMC':
	        		break;
	        
        }
        if (sentenceType == 'RMC'){
            var rmc =  {
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
           return rmc; 
       } else {
            //return {msg: 'This is '+ sentenceType};
            return false;
       }

    }


    // sentence types
    /*rmc: {
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
  },

 vtg: {
    trackTrue: +fields[1],
    trackMagnetic: +fields[3],
    speedKnots: +fields[5],
    speedKmph: +fields[7]
  },

gsv: {
    numMsgs: +fields[1],
    msgNum: +fields[2],
    satsInView: +fields[3],
    satellites: sats
  },

gsa: {
    selectionMode: fields[1],
    mode: +fields[2],
    satellites: sats,
    PDOP: fields[15],
    HDOP: fields[16],
    VDOP: fields[17]
  }*/
};