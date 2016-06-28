var fs = require('fs');
var Q = require('q');
var md5 = require('md5');
var config = require('./config');
var httpreq = require('httpreq');
var parseString = require('xml2js').parseString;

exports.prettyInfoV2 = prettyInfoV2;

exports.getOrCreateXml = function(url) {
  	var deferred = Q.defer();
    var file;
  	if (fileExists(config.api.cache+md5(url))) {
	  	var xml = fs.readFileSync(config.api.cache+md5(url));
	  	if (xml.toString()) {
  		 	console.log('file cached.', md5(url));
		  	convertXmlToJson(xml.toString()).then(function(xmlObj){
            console.log('XML convertido para JSON');
	        	deferred.resolve(xmlObj);
      	});
	  	} else {
		  	file = fs.createWriteStream(config.api.cache+md5(url));
		   	httpreq.get(url, function (err, res){
	        	file.write(res.body);
	        	var xml = fs.readFileSync(config.api.cache+md5(url));
		        convertXmlToJson(res.body).then(function(xmlObj){
		  		    console.log('cache exist but is null, cache created.', md5(url));
			        deferred.resolve(xmlObj);
		      	});
		    });
	  	}
	} else {
		file = fs.createWriteStream(config.api.cache+md5(url));

	   	httpreq.get(url, function (err, res){
        	file.write(res.body);
        	var xml = fs.readFileSync(config.api.cache+md5(url));
		      convertXmlToJson(res.body).then(function(xmlObj){
		  		console.log('cache not exist, cache created.', md5(url));
		        deferred.resolve(xmlObj);
	      	});
	    });
	}

	return deferred.promise;
};

function convertXmlToJson(xml) {
	var deferred = Q.defer();
	parseString(xml, {explicitArray: false}, function (err, xmlObj) {
	    deferred.resolve(xmlObj);
	});
	return deferred.promise;
}

function fileExists(filePath)
{
    try {
        return fs.statSync(filePath).isFile();
    } catch (err) {
        return false;
    }
}

exports.mountUrl = function(models) {
    //console.log("FIND -->", models.length);
    var url = config.api.url+config.api.anime;
    for (var i = models.length - 1; i >= 0; i--) {
      var an = models[i];
      url += "" + an.id;
      if (i - 1 >= 0) {
        url += "/";
      }
    }
    return url;
};


function prettyInfoV2(anime) {
    try {
      var animePretty = {};
      animePretty.id = anime.$.id;
      animePretty.gid = anime.$.gid;
      animePretty.type = anime.$.type;
      animePretty.name = anime.$.name;
      animePretty.original_creator = '';
      animePretty.precision = anime.$.precision;
      animePretty.update = anime.$['generated-on'];
      var pictures = getInfo(anime.info, 'Picture');
      animePretty.pictures = [];
      var newPic;
      console.log('get Pictures');
      if (pictures && pictures.img.length > 0) {
        for (var i = 0; i < pictures.img.length; i++) {
          newPic = {"src":pictures.img[i].$.src, "width": parseFloat(pictures.img[i].$.width), "height": parseFloat(pictures.img[i].$.height)};
          animePretty.pictures.push(newPic);
        }
      } else {
        if (pictures) {
          newPic = {"src": pictures.img.$.src, "width": parseFloat(pictures.img.$.width), "height": parseFloat(pictures.img.$.height)};
          animePretty.pictures.push(newPic);
        }
      }
      animePretty.title = getInfo(anime.info, 'Main title', false, true, true);
      animePretty.alternative_titles = getInfo(anime.info, 'Alternative title', true, true, true);
      animePretty.genres = getInfo(anime.info, 'Genres', true, true, false, true);
      animePretty.themes = getInfo(anime.info, 'Themes', true, true, false, true);
      animePretty.description = getInfo(anime.info, 'Plot Summary', false, true, false);
      animePretty.vintage = getInfo(anime.info, 'Vintage', false, true, false);

      var re = /(\d*)\s*(.*)/;
      var str = getInfo(anime.info, 'Number of episodes', false, true, false);
      var m;

      if (str) {
        if ((m = re.exec(str)) !== null) {
              if (m.index === re.lastIndex) {
                  re.lastIndex++;
              }
        }
      }

      if (str) {
        if (m[1] !== "") {
          animePretty.number_episodes = m[1];
        }

        if (m[2] !== "") {
          animePretty.obs_episodes = m[2];
        }
      }

      animePretty.opening = getInfo(anime.info, 'Opening Theme', true, true, false);
      animePretty.ending = getInfo(anime.info, 'Ending Theme', true, true, false);
      if (anime.ratings) {
        animePretty.rating = anime.ratings.$.weighted_score;
      }

    console.log('get episodes');
    animePretty.episodes = [];
    if (anime.episode) {
      if (anime.episode.length > 0) {
            var title;

        for (var c = anime.episode.length - 1; c >= 0; c--) {
          var epi = anime.episode[c];

          if (epi.title.length > 0) {
            for (var j = epi.title.length - 1; j >= 0; j--) {
              title = {
                    num: epi.$.num,
                  gid: epi.title[j].$.gid,
                  lang: epi.title[j].$.lang,
                  title: epi.title[j]._,
                  part: epi.title[j].$.part,
                  };

              animePretty.episodes.push(title);
            }
          } else {
            title = {
                  num: epi.$.num,
                gid: epi.title.$.gid,
                lang: epi.title.$.lang,
                title: epi.title._
                };
            animePretty.episodes.push(title);
          }

        }
      } else {
                var titleE;

          if (anime.episode.title.length > 0) {
            for (var d = anime.episode.title.length - 1; d >= 0; d--) {
              var t = anime.episode.title[d];

              titleE = {
                  num: anime.episode.$.num,
                gid: t.$.gid,
                lang: t.$.lang,
                title: t._,
                part: t.$.part
                };

              animePretty.episodes.push(titleE);

            }
          } else {

            titleE = {
                    num: anime.episode.$.num,
                  gid: anime.episode.title.$.gid,
                  lang: anime.episode.title.$.lang,
                  title: anime.episode.title._
                  };

            animePretty.episodes.push(titleE);
          }
      }
    }
    console.log('get staff');
    animePretty.staff = [];
    if (anime.staff) {
        var personStaff;
      if (anime.staff.length > 0) {
        for (var a = anime.staff.length - 1; a >= 0; a--) {
          var staff = anime.staff[a];
          personStaff = {
                  gid: staff.$.gid,
                  task: staff.task,
                  person: staff.person._,
                  person_id: staff.person.$.id
                };
          if (staff.task === 'Original creator') {
            animePretty.original_creator = staff.person._;
          }

          animePretty.staff.push(personStaff);
        }
      } else {
             personStaff = {
                  gid: anime.staff.$.gid,
                  task: anime.staff.task,
                  person: anime.staff.person._,
                  person_id: anime.staff.person.$.id
                };
          if (anime.staff.task === 'Original creator') {
            animePretty.original_creator = anime.staff.person._;
          }

        animePretty.staff.push(personStaff);
      }
    }

    console.log('get cast');
    animePretty.cast = [];
    if (anime.cast) {
        var personCast;
      if (anime.cast.length > 0) {
        for (var u = anime.cast.length - 1; u >= 0; u--) {
          var cast = anime.cast[u];
          personCast = {
                  gid: cast.$.gid,
                  lang: cast.$.lang,
                  role: cast.role,
                  person: cast.person._,
                  person_id: cast.person.$.id,
                };

          animePretty.cast.push(personCast);
        }
      } else {
          personCast = {
                  gid: anime.cast.$.gid,
                  lang: anime.cast.$.lang,
                  role: anime.cast.role,
                  person: anime.cast.person._,
                  person_id: anime.cast.person.$.id,
                };

          animePretty.cast.push(personCast);
      }
    }

    console.log('get credit');
    animePretty.credit = [];
    if (anime.credit) {
        var personCredit;
      if (anime.credit.length > 0) {
        for (var y = anime.credit.length - 1; y >= 0; y--) {
          var credit = anime.credit[y];
          personCredit = {
                  gid: credit.$.gid,
                  task: credit.task,
                  company: credit.company._,
                  company_id: credit.company.$.id,
                };

          animePretty.credit.push(personCredit);
        }
      } else {
        personCredit = {
                  gid: anime.credit.$.gid,
                  task: anime.credit.task,
                  company: anime.credit.company._,
                  company_id: anime.credit.company.$.id,
                };

        animePretty.credit.push(personCredit);
      }
    }


    console.log('get relatedPrev');
    animePretty.relatedPrev = [];
    if (anime['related-prev']) {
        var addPrev;
      if (anime['related-prev'].length > 0) {
        for (var r = anime['related-prev'].length - 1; r >= 0; r--) {
           var prev = anime['related-prev'][r];

           addPrev = {
            rel: prev.$.rel,
            id: prev.$.id,
           };
           animePretty.relatedPrev.push(addPrev);
        }
      } else {
        addPrev = {
          rel: anime['related-prev'].$.rel,
          id: anime['related-prev'].$.id,
        };
        animePretty.relatedPrev.push(addPrev);
      }
    }

    console.log('get relatedNext');
    animePretty.relatedNext = [];
    if (anime['related-next']) {
        var addNext;
      if (anime['related-next'].length > 0) {
        for (var e = anime['related-next'].length - 1; e >= 0; e--) {
          var next = anime['related-next'][e];

          addNext = {
            rel: next.$.rel,
            id: next.$.id,
                };
               animePretty.relatedNext.push(addNext);
        }
      } else {
        addNext = {
          rel: anime['related-next'].$.rel,
          id: anime['related-next'].$.id,
          };
        animePretty.relatedNext.push(addNext);
      }
    }



    console.log('get number_episodes');
    if (!animePretty.number_episodes) {
      animePretty.number_episodes = animePretty.episodes.length;
    }

    console.log('done prettyInfoV2');
    return animePretty;

  } catch(err) {
    console.log(err);
  }
}



function getInfo(infosNode, infoGet, multi, valueOnly, withLang, lower) {
  multi = multi || false;
  valueOnly = valueOnly || false;
  withLang = withLang || false;
  var finds = [];
  if (infosNode) {
    for (var i = 0; i < infosNode.length; i++) {
      var node = infosNode[i];
      if (node.$.type === infoGet) {
        if (multi) {
          if (valueOnly) {
            if (withLang) {
              var obj = {};
              obj.text = node._;
              obj.lang = node.$.lang;
              if (node.$.href) {
                obj.href = node.$.href;
              }
              if (lower) {
                finds.push(obj.toLowerCase());
              }else {
                finds.push(obj);
              }
            } else {
              if (lower) {
                finds.push(node._.toLowerCase());
              }else {
                finds.push(node._);
              }
            }
          } else {
            if (lower) {
              finds.push(node.toLowerCase());
            }else {
              finds.push(node);
            }
          }
        } else {
          if (valueOnly) {
            if (withLang) {
              var objWlang = {};
              objWlang.text = node._;
              objWlang.lang = node.$.lang;
              if (node.$.href) {
                objWlang.href = node.$.href;
              }
              return objWlang;
            }
            return node._;
          }
          return node;
        }
      }
    }
  }//if

  if (finds.length > 0) {
    return finds;
  }

  return false;
}
