module.exports = {
    'database': 'mongodb://127.0.0.1:27017/animesManga',
    'api': {
    	'url' : 'http://cdn.animenewsnetwork.com/encyclopedia/',
    	'basic' : 'reports.xml?id=155&type=anime&nlist=all',
    	'last' : 'reports.xml?id=155&type=anime&nlist=50',
    	'anime' : 'nodelay.api.xml?anime=',
    	'manga' : 'nodelay.api.xml?manga=',
    	'cache' : './cache/'
    }
};