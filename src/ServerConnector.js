/*
 ---

 name: ServerConnector

 description: Provides an API for communication with the Applitools server.

 provides: [ServerConnector]
 requires: [GeneralUtils]

 ---
 */

;(function() {
    "use strict";

    var GeneralUtils = require('./GeneralUtils'),
        Promise = require('bluebird'),
        restler = require('restler');


    // Constants
    var CONNECTION_TIMEOUT_MS = 5 * 60 * 1000,
        DEFAULT_HEADERS = {'Accept': 'application/json', 'Content-Type': 'application/json'},
        SERVER_SUFFIX = '/api/sessions/running';

    /**
     *
     * C'tor = initializes the module settings
     *
     * @param {String} serverUri
     * @param {String} userName - the user name (in fact - SDK-ID)
     * @param {String} password - the password (in fact - account id)
     *
     **/
    function ServerConnector(serverUri, userName, password) {
        this._serverUri = GeneralUtils.urlConcat(serverUri, SERVER_SUFFIX);
        this._httpOptions = {
            username: userName,
            password: password,
            headers: DEFAULT_HEADERS,
            timeout: CONNECTION_TIMEOUT_MS
        };
    }

    /**
     *
     * Starts a new running session in the server. Based on the given parameters,
     * this running session will either be linked to an existing session, or to
     * a completely new session.
     *
     * @method _startSession
     * @param {Object} sessionStartInfo - The start parameters for the session.
     * @return {Object} Promise with a resolve result that represents the current running session.
     *
     **/
    ServerConnector.prototype.startSession = function (sessionStartInfo) {
        return new Promise(function (resolve, reject) {
            restler.postJson(this._serverUri, {startInfo: sessionStartInfo}, this._httpOptions)
                .on('complete', function(data, response) {
                    console.log('start session result ', response,' status code ', response.statusCode);
                    if (response.statusCode == 200 || response.statusCode == 201) {
                        resolve({sessionId: data['id'], sessionUrl: data['url'],
                            isNewSession: response.statusCode == 201});
                    } else {
                        reject(response);
                    }
                });
        }.bind(this));
    };

    ServerConnector.prototype.endSession = function (runningSession, isAborted, save) {
        return new Promise(function (resolve, reject) {
            var data = {aborted: isAborted, updateBaseline: save};
            console.log("End session: %s", data);
            var url = GeneralUtils.urlConcat(this._serverUri, runningSession.sessionId.toString());
            restler.json(url, data, this._httpOptions, 'DELETE')
                .on('complete', function(data, response) {
                    console.log('end session result ', response,' status code ', data.statusCode);
                    if (response.statusCode == 200 || response.statusCode == 201) {
                        resolve({
                            steps: data['steps'],
                            matches: data['matches'],
                            mismatches: data['mismatches'],
                            missing: data['missing'],
                            exactMatches: data['exactMatches'],
                            strictMatches: data['strictMatches'],
                            contentMatches: data['contentMatches'],
                            layoutMatches: data['layoutMatches'],
                            noneMatches: data['noneMatches']
                        });
                    } else {
                        reject("error on server connector endSession");
                    }
                });
        }.bind(this));
    };

    ServerConnector.prototype.matchWindow = function (runningSession, matchWindowData) {
        return new Promise(function (resolve, reject) {
            var url = GeneralUtils.urlConcat(this._serverUri, runningSession.sessionId.toString());
            var options = Object.create(this._httpOptions);
            options.headers = Object.create(this._httpOptions.headers);
            options.headers['Content-Type'] = 'application/octet-stream';
            restler.postJson(url, matchWindowData, options)
                .on('complete', function(data, response) {
                    if (response.statusCode == 200 || response.statusCode == 201) {
                        resolve({asExpected: data.asExpected});
                    } else {
                        reject(JSON.parse(response));
                    }
                });
        }.bind(this));
    };

    module.exports = ServerConnector;
}());
