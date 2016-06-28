var moment = require('moment');
var mongoose = require('mongoose');
var u = require('./utils');
var async = require('async');
var commandLineArgs = require('command-line-args');
var Q = require('q');
var fs = require('fs');
var assert = require('assert');
var prompt = require('prompt');
prompt.start();



var Anime = require('./models/anime');
var Genre = require('./models/genre');
var Theme = require('./models/theme');
var config = require('./config');

mongoose.connect(config.database);


var cli = commandLineArgs([
  { name: 'minimum', alias: 'm', type: Boolean, description: 'Get the minimum info about animes from ANN'},
  { name: 'all', alias: 'a', type: Boolean, description: 'Get all the info about animes from ANN'},
  { name: 'last', alias: 'l', type: Boolean, description: 'Get and save info about fiften (50) last animes from ANN'},
  { name: 'get', alias: 'g', type: Boolean, description: 'Get one'},
  { name: 'id', alias: 'i', type: String, description: 'ID to get'},
  { name: 'type', alias: 't', type: String, description: 'Type of return json or raw'},
  { name: 'parser', alias: 'p', type: Boolean, description: 'Save each anime found in all.js in a separate file.'},
]);

var options = cli.parse();


if (!options.minimum && !options.last && !options.all && !options.get && !options.parser) {
    console.log(cli.getUsage());
    process.exit();
}

if ("minimum" in options) {
	resume().then(process.exit);
}

if ("last" in options) {
	last().then(function(){
        animeQueue.resume();
    });
}

if ("all" in options) {
	all().then(function(){
        //
        // Get two properties from the user: username and email
        //
        prompt.get(['Pressione enter para continuar, serão importados ' + animeQueue.tasks.length + ' animes.'], function (err, result) {

            animeQueue.resume();
            fs.writeFile('all.json', JSON.stringify(animeQueue.tasks), function(err){
                assert.equal(err, null);
                //process.exit(0);
            });
        });
    });
}

if ("get" in options) {
	get().then(process.exit);
}


if ("parser" in options) {
    var animes = fs.readFileSync('all.json');
    animes = JSON.parse(animes);
    for (var i = 0; i < animes.length; i++) {
        var anime = animes[i].data;
    	console.log(anime.name);
        fs.writeFileSync('animes/'+anime.id+'.json', JSON.stringify(anime));
    }
    process.exit(0);
}



var animeQueue = async.queue(updateAnime, 1);
animeQueue.drain = function(){ genreQueue.resume(); console.log('animeQueue finish.');};
animeQueue.pause();

var genreQueue = async.queue(updateGenre, 1);
genreQueue.drain = function(){themeQueue.resume();console.log('genreQueue finish.');};
genreQueue.pause();

var themeQueue = async.queue(updateTheme, 1);
themeQueue.drain = function(){console.log('themeQueue finish.'); process.exit(0);};
themeQueue.pause();

function updateAnime(anime, next) {
	Anime.update({"id": anime.id}, anime, {upsert: true}, function(err, data){
		assert.equal(err, null);
		console.log("imported:", anime.name);

        for (var k = anime.genres.length - 1; k >= 0; k--) {
            genreQueue.push(anime.genres[k]);
        }

        for (var j = anime.themes.length - 1; j >= 0; j--) {
            themeQueue.push(anime.themes[j]);
        }

		next();
	});
}

function updateGenre(genre, next) {
	Genre.update({"name": genre}, {"name": genre}, {upsert: true}, function(err, data){
        console.log("genre: ", genre);
        assert.equal(err, null);
        next();
    });
}

function updateTheme(theme, next) {
	Theme.update({"name": theme}, {"name": theme}, {upsert: true}, function(err, data){
        console.log("theme: ", theme);
        assert.equal(err, null);
        next();
    });
}



function all() {
    var deferred = Q.defer();

	var q = async.queue(function(task, next) {
		async.setImmediate(function(){
				console.log("importing... "+task.offset);
				Anime.find({})
					.limit(task.limit)
					.skip(task.offset)
					.exec(function(err, docs){
						var url = u.mountUrl(docs);
                        console.log('montado urls para ', docs.length);

                        try {
                            u.getOrCreateXml(url).then(function(xml){
                                if (!xml.ann.warning) {
                                    console.log("getOrCreateXml find", xml.ann.anime.length);
                                    for (var i = xml.ann.anime.length - 1; i >= 0; i--) {
                                        var json = u.prettyInfoV2(xml.ann.anime[i]);
                                        json.last_update = moment().format();
                                        animeQueue.push(json);
                                    }
                                }
                                console.log(animeQueue.tasks.length);
                                next();
                            });
                        } catch(e) {
                            console.err(e);
                        }
                    });
		});
    }, 1); // <--- this number specifies the number of tasks to run in parallel

    //DONE ALL?
    q.drain = function() {
        console.log('DONE...');
    	Anime.find({})
    		.count()
    		.exec(function(err, docs){
				console.log('imported:', docs);
  				deferred.resolve();
    		});
    };

    q.pause();

    Anime.find({})
    	.count()
    	.exec(function(err, qtd){
    		var resto = qtd % 40;
    		var paginas = ((qtd - resto) / 40) + 1;
  			for (var i = 0; i < paginas; i++) {
  				var consulta = {};
  				consulta.limit = 40;
  				consulta.offset = i * consulta.limit;
  				q.push(consulta, function (err) {
                    console.log(err);
                });
  			}
			q.resume();
			console.log('importing...');
    	});

  	return deferred.promise;
}

function resume() {
    var deferred = Q.defer();
	var url = config.api.url+config.api.basic;
	u.getOrCreateXml(url).then(function(xml){
	 		var q = async.queue(function(task, next) {
		      Anime.update({"id": task.id}, task, {upsert: true}, function(err, data) {
		        if(err) {
		          console.error(err);
		          deferred.reject(err);
		        } else {
		          next();
		        }
		      });
		  }, 1); // <--- this number specifies the number of tasks to run in parallel

		    //DONE ALL?
		    q.drain = function() {
		    	Anime.find({}).count().exec(function(err, docs){
					console.log("imported "+docs+ " animes.");
					deferred.resolve();
	    		});
		    };

		    q.pause();
		   	for (var i = xml.report.item.length - 1; i >= 0; i--) {
				q.push(xml.report.item[i]);
			}
			q.resume();
	});

  	return deferred.promise;
}

function last() {
    var deferred = Q.defer();

	var url = config.api.url+config.api.last;
	u.getOrCreateXml(url).then(function(xml){
		    var url = u.mountUrl(xml.report.item);
			u.getOrCreateXml(url).then(function(xml){
				for (var i = xml.ann.anime.length - 1; i >= 0; i--) {
					var json = u.prettyInfoV2(xml.ann.anime[i]);
					json.last_update = moment().format();
					animeQueue.push(json);
				}
				console.log("update info to last "+models.length+ " animes.");
				deferred.resolve();
  			});
	});
  	return deferred.promise;

}

function get(){
    var deferred = Q.defer();

	var id = options.id;
	var type = options.type;

	var file = fs.createWriteStream('./get.json');
  	var url = config.api.url + config.api.anime + id;
  	u.getOrCreateXml(url).then(function(xml){
		if (type == 'raw') {
        	fs.writeFile('get.json', JSON.stringify(xml), function(err){
				defanime.infoanime.infoerred.resolve();
        	});
		} else {
			var json = u.prettyInfoV2(xml.ann.anime);
        	fs.writeFile('get.json', JSON.stringify(json), function(err){
        		console.log(json.id);
        		console.log(json.name);
        		Anime.update({"id": json.id}, json, {upsert: true}, function(err, data) {
			        if(err) {
			          	console.error(err);
			        }
			        console.log("data", data);
					deferred.resolve();
		      	});

				for (var i = json.genres.length - 1; i >= 0; i--) {
					var newgenre = json.genres[i];
					console.log(newgenre);

					Genre.update({"name": newgenre}, {"name": newgenre}, {upsert: true}, function(err, data) {
				        if(err) {
				          	console.error(err);
				        }
		      		});
				};

				for (var i = json.themes.length - 1; i >= 0; i--) {
					var newtheme = json.themes[i];
					console.log(newtheme);

					Theme.update({"name": newtheme}, {"name": newtheme}, {upsert: true}, function(err, data) {
				        if(err) {
				          	console.error(err);
				        }
		      		});
				};
        	});
		}
  	});

  	return deferred.promise;

}
