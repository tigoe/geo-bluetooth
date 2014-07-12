var dBase = {
	// "remote" here could be a localhost or the cloud; the couch db to sync with 
	//remoteServer: 'http://192.168.1.2:5984/',
	remoteServer: 'http://my.ip.addr:5984/',  //using dummy default as a format guide
	remoteDbName: 'geo-bluetooth-raw',
	pouchDbName: '',
	
	init: function (dbname){ 
		this.db = new PouchDB(dbname);
		this.pouchDbName = dbname;
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
	couchReplicate: function(){ 
		if (!this.remoteServer || !this.remoteDbName){ 
			return false;
		}
		var opts = {live: false};
		var fullRemotePath = this.remoteServer + this.remoteDbName; 

		/* NOTES: 
		.replicate() returns a event emitter, so it could get returned from this function,
		with the on() events handled where they are needed instead (similar to promises)

		but the problem is that no feedback is given if target (remote) URL is not reachable.
		 .. i put in a question/rfi at https://github.com/pouchdb/pouchdb/issues/1001

		a work-around might be to check actually hitting the url via ajax when it is validated for slashes, etc
		*/
		console.log(this.db);
		var ro = this.db.replicate.to(fullRemotePath, opts);

		return ro;
		  /*.on('complete', function (info) {
		    // handle complete
		    console.log('on complete');
		    console.log(JSON.stringify(info));
		  }).on('error', function (err) {
		    // handle error
		    console.log('on error');
		    console.log(JSON.stringify(err));
		  });*/
		/*this.db.replicate.to(fullRemotePath, opts)
		 .on('complete',function(info){
		 	console.log('on complete called @#@#@#@#!@#@!#');
		 	console.log(JSON.stringify(info));
		 	callback('testA','testB','testC');

		 })
		 .on('error',function(err){
		 	console.log(err);
		 });*/

		// options for couchDB sync
		/*var opts = { live: false, complete:function(err,res){
			var result_msg = false;
			var success = false;

			if (err){
				console.log('!!HEY!!! Couch error!   '+ JSON.stringify(err));
				err_msg = '';
				for (var e in err){
					err_msg += e + ': ' + err[e] + '____';
				}
				console.log('DB ERROR RESPONSE: '+ err_msg);
				
				//result_msg = 'DB ERROR RESPONSE: '+ JSON.stringify(res) + 'DB ERROR MESSAGE: ' + JSON.stringify(err);
				
				result_msg = 'There was an error connecting to Couch database ';
				result_msg += dBase.remoteDbName;
				result_msg += ' on server ' + dBase.remoteServer;
				result_msg += ' Database response: ' + err.toString();
				//alert('debug: couch error in couchReplicate '+result_msg);
				//app.display('debug: couch error in couchReplicate');

			} else {
				console.log('!!HEY!!! Couch success!');
				
				// format of pouch response object
				// {
				//   "doc_write_failures": 0, 
				//   "docs_read": 2, 
				//   "docs_written": 2, 
				//   "end_time": "Fri May 16 2014 18:26:00 GMT-0700 (PDT)", 
				//   "errors": [], 
				//   "last_seq": 2, 
				//   "ok": true, 
				//   "start_time": "Fri May 16 2014 18:26:00 GMT-0700 (PDT)", 
				//   "status": "complete"
				// }
				success = true;
				result_msg = 'Successfully saved to CouchDB.';
			}
			console.log('ready to callback ln 98');
			callback(result_msg,success,res.docs_written);
		}};*/

	},
	numDocs: function(callback){
		// asks for doc info but does not include the documents themselves (compare to all() function above)
		this.db.allDocs({}, function(err, doc) { 
			// send back number of rows
			callback(doc.total_rows);
		});
	},
	/* 
	Add a text attachment to an exisiting doc, or create a new doc
	@doc 	 	object w the id and rev # of doc to attach to OR false to create a new doc
	@dataArr 	array of strings that will compose the text file
	@fieldName 	name of the property in the db doc that contains the attachment
	*/
	attachTxtFile: function(doc,dataArr,fieldName){
		// function to execute the attachment
		var attach = function(obj,arr,fname){
			if (!fname){fname = 'text';}
			// create the file
			var txtdoc = new Blob(arr);
			// return promise
			return dBase.db.putAttachment( 
				obj.id, 
				fname, 
				obj.rev, 
				txtdoc, 
				'text/plain'
				);
		};
		// if no doc provided, make a new one.
		if (doc === false){
			var newdoc = {datetime:new Date()}; // empty except for timestamp
			return this.db.post(newdoc).then(function(response){
				attach(response,dataArr,fieldName);
			});
		} else {
			attach(doc,dataArr,fieldName);
		}
		
	},
	checkDbAddr: function(){
		//var path = this.remoteServer + this.remoteDbName;
		return $.get(this.remoteServer);
	}

};