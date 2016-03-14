var React = require('react');
var ReactDOM = require('react-dom');
var Adal = require('./adal/adal-request');
var Groups = require('./Groups.jsx');

require('../node_modules/office-ui-fabric/dist/css/fabric.min.css');
require('../node_modules/office-ui-fabric/dist/css/fabric.components.min.css');
require('../css/styles.css');

var App = React.createClass({
  render: function() {
    return (
      <div>
        <h1 className="ms-font-xxl">My groups</h1>
        <Groups />
      </div>
    );
  }
});

Adal.processAdalCallback();

if (window === window.parent) {
  ReactDOM.render(<App />, document.getElementById('app'));
}