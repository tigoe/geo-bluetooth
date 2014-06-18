nmeaParser = {

   validLine : function(line) {
 

    parse: function(sentence){
        var fields = sentence.split('*')[0].split(',');
        
        sentenceType = fields[0].substr(2);
        /*if (fields[0].charAt(1) == 'P') {
            //talker_id = 'P'; // Proprietary
            sentenceType = fields[0].substr(2);
        } else {
            //talker_id = fields[0].substr(1, 2);
            sentenceType = fields[0].substr(3);
        }*/

        console.log(sentenceType);
        
        
        switch (sentenceType) {
            case 'RMC':
               break;
            case 'GGA':
               break;
            case 'VTG':
               break;
            case 'GSA':
               break;
            case 'GSV': 
               break;
        }
    },


    // sentence types
    rmc: function(fields) {
      var record = {
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
        return record;       
  },

 vtg: function(fields) {
      var record = {
    trackTrue: +fields[1],
    trackMagnetic: +fields[3],
    speedKnots: +fields[5],
    speedKmph: +fields[7]

       };
        return record;       
  },

gsv:  function(fields){
      var record = {
   numMsgs: +fields[1],
    msgNum: +fields[2],
    satsInView: +fields[3],
    satellites: sats
           };
        return record;       

  },

gsa:  function(fields){
     var record = {
    selectionMode: fields[1],
    mode: +fields[2],
    satellites: sats,
    PDOP: fields[15],
    HDOP: fields[16],
    VDOP: fields[17]
         };
        return record;       

  }
};