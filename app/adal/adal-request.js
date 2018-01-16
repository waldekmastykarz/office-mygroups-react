var q = require('q');
var AuthenticationContext = require('expose?AuthenticationContext!adal-angular');
var adalConfig = require('./adal-config');

var _adal = new AuthenticationContext(adalConfig);
var _oauthData = { isAuthenticated: false, userName: '', loginError: '', profile: '' };

var processAdalCallback = function () {
  var hash = window.location.hash;

  if (_adal.isCallback(hash)) {
    if (window.parent && window.parent._adalInstance) {
      _adal = window.parent._adalInstance;
    }

    if (_adal._openedWindows.length > 0) {
      var lastWindow = _adal._openedWindows[_adal._openedWindows.length - 1];
      if (lastWindow.opener &&
        lastWindow.opener._adalInstance) {
        _adal = lastWindow.opener._adalInstance;
      }
    }

    // callback can come from login or iframe request
    _adal.verbose('Processing the hash: ' + hash);
    var requestInfo = _adal.getRequestInfo(hash);
    _adal.saveTokenFromHash(requestInfo);
    window.location.hash = '';
    // Return to callback if it is sent from iframe
    var callback = _adal._callBackMappedToRenewStates[requestInfo.stateResponse] || _adal.callback;

    if (requestInfo.stateMatch) {
      if (callback && typeof callback === 'function') {
        // Call within the same context without full page redirect keeps the callback
        if (requestInfo.requestType === _adal.REQUEST_TYPE.RENEW_TOKEN) {
          // Idtoken or Accestoken can be renewed
          if (requestInfo.parameters['access_token']) {
            callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['access_token']);
            return;
          }
          else {
            if (requestInfo.parameters['id_token']) {
              callback(_adal._getItem(_adal.CONSTANTS.STORAGE.ERROR_DESCRIPTION), requestInfo.parameters['id_token']);
              return;
            }
          }
        }
      }
      else {
        // normal full login redirect happened on the page
        updateDataFromCache(_adal.config.loginResource);
        if (_oauthData.userName) {
          //IDtoken is added as token for the app
          window.setTimeout(function () {
            updateDataFromCache(_adal.config.loginResource);
            // redirect to login requested page
            var loginStartPage = _adal._getItem(_adal.CONSTANTS.STORAGE.START_PAGE);
            if (loginStartPage) {
              window.location.path(loginStartPage);
            }
          }, 1);
        }
      }
    }
  }
}

var updateDataFromCache = function (resource) {
  // only cache lookup here to not interrupt with events
  var token = _adal.getCachedToken(resource);
  _oauthData.isAuthenticated = token !== null && token.length > 0;
  var user = _adal.getCachedUser() || { userName: '' };
  _oauthData.userName = user.userName;
  _oauthData.profile = user.profile;
  _oauthData.loginError = _adal.getLoginError();
};

var isAuthenticated = function () {
  var deferred = q.defer();

  updateDataFromCache(_adal.config.loginResource);
  if (!_adal._renewActive && !_oauthData.isAuthenticated && !_oauthData.userName) {
    if (!_adal._getItem(_adal.CONSTANTS.STORAGE.FAILED_RENEW)) {
      // Idtoken is expired or not present
      _adal.acquireToken(_adal.config.loginResource, function (error, tokenOut) {
        if (error) {
          _adal.error('adal:loginFailure', 'auto renew failure');
          deferred.reject();
        }
        else {
          if (tokenOut) {
            _oauthData.isAuthenticated = true;
            deferred.resolve();
          }
          else {
            deferred.reject();
          }
        }
      });
    }
    else {
      deferred.resolve();
    }
  }
  else {
    deferred.resolve();
  }

  return deferred.promise;
}

var makeRequest = function (settings) {
  var deferred = q.defer();

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function () {
    if (this.readyState === 4) {
      if (this.status === 200) {
        deferred.resolve(this.response);
      }
      else if (this.status >= 400) {
        deferred.reject();
      }
    }
  }
  xhr.open(settings.method || 'GET', settings.url, true);

  for (var header in settings.headers) {
    xhr.setRequestHeader(header, settings.headers[header]);
  }

  xhr.responseType = settings.dataType || 'json';
  xhr.send(settings.data);

  return deferred.promise;
}

var adalRequest = function (settings) {
  var deferred = q.defer();

  isAuthenticated().then(function () {
    var resource = _adal.getResourceForEndpoint(settings.url);

    if (!resource) {
      _adal.info('No resource configured for \'' + settings.url + '\'');
      deferred.reject();
      return deferred.promise;
    }

    var tokenStored = _adal.getCachedToken(resource);
    if (tokenStored) {
      if (!settings.headers) {
        settings.headers = {};
      }

      settings.headers.Authorization = 'Bearer ' + tokenStored;

      makeRequest(settings).then(deferred.resolve, deferred.reject);
    }
    else {
      var isEndpoint = false;

      for (var endpointUrl in _adal.config.endpoints) {
        if (settings.url.indexOf(endpointUrl) > -1) {
          isEndpoint = true;
        }
      }

      if (_adal.loginInProgress()) {
        _adal.info('Login already in progress');
        deferred.reject();
      }
      else if (isEndpoint) {
        _adal.acquireToken(resource, function (error, tokenOut) {
          if (error) {
            deferred.reject();
            _adal.error(error);
          }
          else {
            if (tokenOut) {
              _adal.verbose('Token is available');
              if (!settings.headers) {
                settings.headers = {};
              }
              settings.headers.Authorization = 'Bearer ' + tokenOut;
              makeRequest(settings).then(deferred.resolve, deferred.reject);
            }
          }
        });
      }
    }
  }, function () {
    _adal.login();
  })

  return deferred.promise;
}

module.exports = {
  adalRequest: adalRequest,
  processAdalCallback: processAdalCallback
}