var dBase = {
	remoteServer: 'http://192.168.1.2:5984/', // "remote" here could be a localhost or the cloud; the couch db to sync with 
	remoteDbName: 'geo-bluetooth',
	
	init: function (dbname){ 
		this.db = new PouchDB(dbname);
	},
	all: function(callback){ //takes a callback function in order to return records
		this.db.allDocs({include_docs: true},  
			function (err, doc) {
		    	callback(doc.rows);
		    });
	},
	add: function(record,callback){
		this.db.post(record, function (err, result) {
			if (!err) {
				//console.log('Successfully added a record!');
				callback(result);
			} else {
				//console.log('could not add record');
			}
		});
	},
	update: function(record,callback){
		this.db.put(record, function (err, result) {
			if (!err) {
				//console.log('Successfully updated a record!');
				callback(result);
			} else {
				//console.log('could not add record');
			}
		});
	},
	find: function(id,callback){
		this.db.get(id, function(err, doc){
			if (!err) {
				callback(doc);
			} else {
				//error
			}
		});
	},
	couchReplicate: function(){ 
		if (!this.remoteServer || !this.remoteDbName){ 
			return false;
		}

		// option for couchDB sync
		var opts = { live: false, complete:function(err,res){
			if (err){
				err_msg = '';
				for (var e in err){
					err_msg += e + ': ' + err[e] + '____';
				}
				//alert('Sync error.  ' + err_msg); 
				//console.log('response '+JSON.stringify(res));
				//console.log('error ' + err_msg);
				alert('MY RESPONSE: '+ JSON.stringify(res) + 'MY ERROR MESSAGE: ' + err_msg);
			} else {
				alert('Successfully saved to CouchDB');
				//console.log('___________sync success_____________');
				//console.log('response '+JSON.stringify(res));
				//console.log('error ' + JSON.stringify(err));
			}
		}};
		var fullRemotePath = this.remoteServer + this.remoteDbName;
		this.db.replicate.to(fullRemotePath, opts);	
	}

};