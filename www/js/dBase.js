var dBase = {
	// "remote" here could be a localhost or the cloud; the couch db to sync with 
	//remoteServer: 'http://192.168.1.2:5984/',
	remoteServer: 'http://my.ip.addr:5984/',  //using dummy default as a format guide
	remoteDbName: 'geo-bluetooth-raw',
	
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
				//console.log('Successfully added a record!');
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

		// options for couchDB sync
		var opts = { live: false, complete:function(err,res){
			var result_msg = false;
			var success = false;
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
				//app.display('debug: couch error in couchReplicate');
			} else {
				/*
				format of pouch response object
				{
				  "doc_write_failures": 0, 
				  "docs_read": 2, 
				  "docs_written": 2, 
				  "end_time": "Fri May 16 2014 18:26:00 GMT-0700 (PDT)", 
				  "errors": [], 
				  "last_seq": 2, 
				  "ok": true, 
				  "start_time": "Fri May 16 2014 18:26:00 GMT-0700 (PDT)", 
				  "status": "complete"
				}*/
				success = true;
				result_msg = 'Successfully saved to CouchDB.';
			}
			callback(result_msg,success,res.docs_written);
		}};
		var fullRemotePath = this.remoteServer + this.remoteDbName; // TODO: correct for missing slash .. and http ... and port
		this.db.replicate.to(fullRemotePath, opts);	
	},
	numDocs: function(callback){
		// asks for doc info but does not include the documents themselves (compare to all() function above)
		this.db.allDocs({}, function(err, doc) { 
			// send back number of rows
			callback(doc.total_rows);
		});
	}

};