var React = require('react');
var Adal = require('./adal/adal-request');
var Loading = require('./Loading.jsx');
var Group = require('./Group.jsx');
var q = require('q');

function getGroupPicture(groupId) {
  var deferred = q.defer();

  Adal.adalRequest({
    url: 'https://graph.microsoft.com/v1.0/groups/' + groupId + '/photo/$value',
    dataType: 'blob'
  }).then(function(image) {
    var url = window.URL || window.webkitURL;
    deferred.resolve({
      id: groupId,
      url: url.createObjectURL(image)
    });
  }, function(err) {
    deferred.reject(err);
  });

  return deferred.promise;
}

var Groups = React.createClass({
  getInitialState: function() {
    return {
      loading: true,
      groups: []
    };
  },

  componentDidMount: function() {
    var component = this;
    component.serverRequest = Adal.adalRequest({
      url: 'https://graph.microsoft.com/v1.0/me/memberOf?$top=500',
      headers: {
        'Accept': 'application/json;odata.metadata=full'
      }
    }).then(function(data) {
      var myGroups = [];

      data.value.forEach(function(groupInfo) {
        // workaround as the rest filter for unified groups doesn't seem to work client-side
        if (groupInfo.groupTypes &&
          groupInfo.groupTypes.indexOf('Unified') > -1) {
          myGroups.push({
            id: groupInfo.id,
            odataId: groupInfo['@odata.id'],
            displayName: groupInfo.displayName,
            description: groupInfo.description,
            email: groupInfo.mail,
            imageUrl: null,
            // not supported in v1.0
            // isFavorite: groupInfo.isFavorite,
            conversationsUrl: 'https://outlook.office365.com/owa/#path=/group/' + groupInfo.mail + '/mail',
            calendarUrl: 'https://outlook.office365.com/owa/#path=/group/' + groupInfo.mail + '/calendar'
          });
          
          getGroupPicture(groupInfo.id).then(function(pictureInfo) {
            component.setState(function(previousState, curProps) {
              for (var i = 0; i < previousState.groups.length; i++) {
                var g = previousState.groups[i];
                if (g.id === pictureInfo.id) {
                  g.imageUrl = pictureInfo.url;
                  break;
                }
              }
            });
          }, function(err) {
            console.error(err);
          });
        }
      }, this);

      component.setState({
        loading: false,
        groups: myGroups
      })
    }.bind(component));
  },

  componentWillUnmount: function() {
    this.serverRequest.abort();
  },

  render: function() {
    var items = this.state.groups.map(function(group) {
      return (
        <div className="ms-Grid-col ms-u-sm3" key={group.id}>
          <Group group={group} />
        </div>
      );
    });

    var loading = this.state.loading ? <Loading /> : '';

    return (
      <div>
        {loading}
        <div className="ms-Grid"> 
          <div className="ms-Grid-row">
            {items}
          </div>
        </div>
      </div>
    );
  }
});

module.exports = Groups;