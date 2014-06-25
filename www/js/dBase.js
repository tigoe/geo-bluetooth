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
		// response function
		var responseHandler = function (err, result) {
			if (!err) {
				console.log('Successfully added a record!');
				callback(result);
			} else {
				console.log('could not add record');
			}
		};
		// add muliple items using bulkDocs if an array is passed
		if (record instanceof Array){
			this.db.bulkDocs(record, responseHandler);
		} else {
			this.db.post(record, responseHandler);
		}
		
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
	couchReplicate: function(callback){ 
		if (!this.remoteServer || !this.remoteDbName){ 
			return false;
		}

		// option for couchDB sync
		var opts = { live: false, complete:function(err,res){
			var result_msg = false;
			if (err){
				err_msg = '';
				for (var e in err){
					err_msg += e + ': ' + err[e] + '____';
				}
				/*
				result_msg = 'DB ERROR RESPONSE: '+ JSON.stringify(res) + 'DB ERROR MESSAGE: ' + JSON.stringify(err);
				*/
				result_msg = 'There was an error connecting to Couch database ';
				result_msg += dBase.remoteDbName;
				result_msg += ' on server ' + dBase.remoteServer;
				result_msg += ' Database response: ' + err.toString();
				//alert('debug: couch error in couchReplicate');
				app.display('debug: couch error in couchReplicate');
			} else {
				//alert('Successfully saved to CouchDB');
				//app.showStatus('Successfully saved to CouchDB');
				result_msg = 'Successfully saved to CouchDB'
				
			}
			callback(result_msg);
		}};
		var fullRemotePath = this.remoteServer + this.remoteDbName; // TODO: correct for missing slash .. and http ... and port
		this.db.replicate.to(fullRemotePath, opts);	
	}

};