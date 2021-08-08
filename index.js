const restify = require('restify');
const config = require('config');
const fetch = require('node-fetch');
const vtquery = require('@mapbox/vtquery');

const mercator = require('global-mercator');
const TILES = config.get('tiles');

const queryRemoteTiles = async (services, lonLat, params) => {
    const serviceList = services && services !== '*' ? services.split(',') : null;
    const tileCandidates = serviceList ? Object.entries(TILES).filter(([serviceName]) => serviceList.includes(serviceName)).map(s => s[1]) : Object.values(TILES);

    const tiles = await Promise.all(tileCandidates.map(async tile => {
        try{
            const [x, y, z] = mercator.lngLatToGoogle(lonLat, tile.zoom);
            let buffer = await fetch(tile.url.replace('{x}', x).replace('{y}', y).replace('{z}', tile.zoom), {compress: true}).then(res => res.buffer());

            return {buffer, z, y, x };
        }catch(e){
            console.error(e);
        }
    }))
      
    const options = {
        ...params,
        ...config.get("vtquery")
    };
      
    return new Promise((resolve, reject) => 
        vtquery(tiles.filter(z => !!z), lonLat, options, function(err, result) {
            if (err) reject(err);
            resolve(result);
        })
    )
}

async function respond(req, res, next) {
    try{
        const {lon, lat, radius, limit, services, layers} = req.query;
        const lonLat = [Number(lon), Number(lat)];

        const params = {
            radius: isFinite(Number(radius)) ? Number(radius) : 0,
            limit: isFinite(parseInt(limit)) && parseInt(limit) >= 0 ? parseInt(limit) : 10,
            ...(layers && typeof layers === 'string' ? {layers: layers.split(',')} : {})
        };

        const responses = await queryRemoteTiles(services, lonLat, params);

        res.contentType = 'json';
        res.send({responses});
        next();
    }catch(e){
        res.contentType = 'json';
        res.send({error: true, mesage: e.message});
    }
}

async function respondV2(req, res, next) {
    try{
        const {services, coordinates} = req.params;
        const [lon, lat] = coordinates.split(',');
        const {radius, limit, layers, direct_hit_polygon} = req.query;
        const lonLat = [Number(lon), Number(lat)];

        const params = {
            radius: isFinite(Number(radius)) ? Number(radius) : 0,
            limit: isFinite(parseInt(limit)) && parseInt(limit) >= 0 ? parseInt(limit) : 10,
            direct_hit_polygon: direct_hit_polygon != null ? true : false,
            ...(layers && typeof layers === 'string' ? {layers: layers.split(',')} : {})
        };

        const responses = await queryRemoteTiles(services, lonLat, params);

        res.contentType = 'json';
        res.send({responses});
        next();
    }catch(e){
        res.contentType = 'json';
        res.send({error: true, mesage: e.message});
    }
}

var server = restify.createServer();
server.get('/query', respond);
server.get('/tilequery/:services/:coordinates', respondV2);

const PORT = process.env.PORT || 8080;
server.use(restify.plugins.queryParser());
server.listen(PORT, function() {
  console.log('%s listening at %s', server.name, server.url);
});