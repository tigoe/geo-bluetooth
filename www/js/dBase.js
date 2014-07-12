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
		---> update: appears fixed in pouchdb 2.2.3
		*/
		return this.db.replicate.to(fullRemotePath, opts);
		
		
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
		
	}
	/*checkDbAddr: function(){
		//var path = this.remoteServer + this.remoteDbName;
		return $.get(this.remoteServer);
	}*/

};